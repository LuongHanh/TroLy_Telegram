// controllers/scheduleController.js
import express from 'express';
import { poolPromise, sql } from '../config/db.js';

const router = express.Router();

/* ============================== HELPER ============================== */
function formatDateVN(dateStr) {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    const hh = String(dateStr.getHours()).padStart(2, '0');
    const mm = String(dateStr.getMinutes()).padStart(2, '0');
    dateStr = `${y}-${m}-${d} ${hh}:${mm}`;
  }

  const [datePart, timePart] = dateStr.split(' ');
  const [year, month, day] = datePart.split('-');
  const [hours, minutes] = timePart.split(':');

  const weekdays = [
    'Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư',
    'Thứ năm', 'Thứ sáu', 'Thứ bảy'
  ];
  const jsDate = new Date(year, month - 1, day);
  const weekday = weekdays[jsDate.getDay()];

  return `${weekday}, ${day}/${month}/${year}, ${hours}:${minutes}`;
}

function priorityLabel(priority) {
  switch (priority) {
    case 1: return 'Ít quan trọng';
    case 2: return 'Khá quan trọng';
    case 3: return 'Quan trọng';
    case 4: return 'Cần làm ngay';
    case 5: return 'Cần chú ý';
    default: return priority;
  }
}

/* ======================= HÀM DÙNG CHO BOT ======================= */
export async function addTask({ title, description, deadline, priority }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Title', sql.NVarChar, title)
    .input('Description', sql.NVarChar, description || null)
    .input('Deadline', sql.NVarChar, deadline || null)
    .input('Priority', sql.Int, priority || 3)
    .input('Status', sql.NVarChar, 'pending')
    .query(`
      INSERT INTO Tasks (Title, Description, Deadline, Priority, Status)
      OUTPUT 
        INSERTED.Id,
        INSERTED.Title,
        INSERTED.Description,
        CONVERT(varchar, INSERTED.Deadline, 120) AS DeadlineStr,
        INSERTED.Priority,
        INSERTED.Status
      VALUES (@Title, @Description, CAST(@Deadline AS datetime), @Priority, @Status)
    `);

  const t = result.recordset[0];
  return {
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  };
}

export async function getTodaySchedule() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT *,
           CONVERT(varchar, Deadline, 120) AS DeadlineStr
    FROM Tasks
    WHERE CAST(Deadline AS DATE) = CAST(GETDATE() AS DATE)
    ORDER BY Deadline ASC
  `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}

export async function getTasksByDate(date) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Date', sql.NVarChar, date)
    .query(`
      SELECT *,
             CONVERT(varchar, Deadline, 120) AS DeadlineStr
      FROM Tasks
      WHERE CAST(Deadline AS date) = CAST(@Date AS date)
      ORDER BY Deadline ASC;
    `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}

export async function getTasksByDateInWeek(dateStr) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Date', sql.VarChar, dateStr)
    .query(`
      SELECT *,
             CONVERT(varchar, Deadline, 120) AS DeadlineStr
      FROM Tasks
      WHERE DATEPART(ISO_WEEK, Deadline) = DATEPART(ISO_WEEK, CAST(@Date AS date))
        AND YEAR(Deadline) = YEAR(CAST(@Date AS date))
      ORDER BY Deadline ASC;
    `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}

export async function getTasksBySomeDay(n) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Days', sql.Int, n)
    .query(`
      SELECT *, CONVERT(varchar, Deadline, 120) AS DeadlineStr
      FROM Tasks
      WHERE Deadline >= CAST(GETDATE() AS date)
        AND Deadline < DATEADD(DAY, @Days + 1, CAST(GETDATE() AS date))
      ORDER BY Deadline ASC;
    `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}

export async function findTaskToUpdate(title, deadline) {
  if (title?.trim().length === 0) title = null;
  if (deadline?.trim().length === 0) deadline = null;

  const pool = await poolPromise;
  const result = await pool.request()
    .input('Title', sql.NVarChar, title)
    .input('Deadline', sql.VarChar, deadline)
    .query(`
      SELECT *,
             CONVERT(varchar(19), Deadline, 120) AS DeadlineStr
      FROM Tasks
      WHERE 1=1
        AND (@Title IS NULL OR Title COLLATE Vietnamese_CI_AI LIKE N'%' + @Title + N'%' COLLATE Vietnamese_CI_AI)
        AND (@Deadline IS NULL OR CAST(Deadline AS date) = TRY_CONVERT(date, @Deadline, 23))
      ORDER BY Deadline ASC;
    `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}

export async function updateTaskFull(id, taskData) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Id', sql.Int, id)
    .input('Title', sql.NVarChar, taskData.title)
    .input('Description', sql.NVarChar, taskData.description)
    .input('Deadline', sql.VarChar, taskData.deadline)
    .input('Priority', sql.Int, taskData.priority || 3)
    .input('Status', sql.NVarChar, taskData.status || 'pending')
    .query(`
      UPDATE Tasks
      SET Title=@Title, Description=@Description, Deadline=CAST(@Deadline AS datetime),
          Priority=@Priority, Status=@Status
      OUTPUT 
        INSERTED.Id,
        INSERTED.Title,
        INSERTED.Description,
        CONVERT(varchar, INSERTED.Deadline, 120) AS DeadlineStr,
        INSERTED.Priority,
        INSERTED.Status
      WHERE Id=@Id
    `);

  const t = result.recordset[0];
  return {
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  };
}

/* ======================= API CHO WEB ======================= */

// Lấy task theo ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Id', sql.Int, req.params.id)
      .query('SELECT *, CONVERT(varchar, Deadline, 120) AS DeadlineStr FROM Tasks WHERE Id=@Id');
    if (!result.recordset.length) return res.status(404).json({ message: 'Task not found' });

    const t = result.recordset[0];
    res.json({
      ...t,
      DeadlineFormatted: formatDateVN(t.DeadlineStr),
      PriorityLabel: priorityLabel(t.Priority)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm task mới
router.post('/', async (req, res) => {
  try {
    const data = await addTask(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật task
router.put('/:id', async (req, res) => {
  try {
    const data = await updateTaskFull(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xoá task
router.delete('/:id', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Id', sql.Int, req.params.id)
      .query('DELETE FROM Tasks WHERE Id=@Id');

    if (result.rowsAffected[0] > 0) {
      res.json({ message: 'Task deleted' });
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Các API bổ sung giống bot
router.get('/today/all', async (req, res) => {
  try {
    const data = await getTodaySchedule();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-date/:date', async (req, res) => {
  try {
    const data = await getTasksByDate(req.params.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/week/:date', async (req, res) => {
  try {
    const data = await getTasksByDateInWeek(req.params.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/someday/:n', async (req, res) => {
  try {
    const data = await getTasksBySomeDay(req.params.n);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* ======================= THÊM 2 HÀM ======================= */
export async function getTasksByMonth(dateStr) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Date', sql.VarChar, dateStr)
    .query(`
      SELECT *,
             CONVERT(varchar, Deadline, 120) AS DeadlineStr
      FROM Tasks
      WHERE MONTH(Deadline) = MONTH(CAST(@Date AS date))
        AND YEAR(Deadline) = YEAR(CAST(@Date AS date))
      ORDER BY Deadline ASC;
    `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}

export async function getTasksByYear(dateStr) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Date', sql.VarChar, dateStr)
    .query(`
      SELECT *,
             CONVERT(varchar, Deadline, 120) AS DeadlineStr
      FROM Tasks
      WHERE YEAR(Deadline) = YEAR(CAST(@Date AS date))
      ORDER BY Deadline ASC;
    `);

  return result.recordset.map(t => ({
    ...t,
    DeadlineFormatted: formatDateVN(t.DeadlineStr),
    PriorityLabel: priorityLabel(t.Priority)
  }));
}
// 🔹 Lấy tasks trong tháng
router.get('/month/:date', async (req, res) => {
  try {
    const data = await getTasksByMonth(req.params.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Lấy tasks trong năm
router.get('/year/:date', async (req, res) => {
  try {
    const data = await getTasksByYear(req.params.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
