// services/reminderService.js
import cron from 'node-cron';
import { poolPromise, sql } from '../config/db.js';
import bot from '../telegram/bot.js';

/* ===================== CONFIG ===================== */
// Routine: nhắc trước 5 phút
const SCHEDULE_REMIND_BEFORE_MIN = 5;
// Tasks: nhắc trước 30 phút
const TASK_REMIND_BEFORE_MIN = 30;

// Sửa lệch DB local +7h (đọc ra bị cộng 7h -> trừ 7h)
// Azure SQL không lệch
const DB_OFFSET_FIX_HOURS = 0;
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Bangkok UTC+7

/* ===================== Utilities ===================== */
const sentCache = new Map(); // key -> expireMs

function cleanupSentCache() {
  const now = Date.now();
  for (const [k, exp] of sentCache) if (exp <= now) sentCache.delete(k);
}

function shouldSendOnce(key, ttlSec = 120) {
  const now = Date.now();
  const exp = sentCache.get(key);
  if (exp && exp > now) return false;
  sentCache.set(key, now + ttlSec * 1000);
  return true;
}

async function sendTG(text) {
  try {
    const chatId = process.env.MY_TELEGRAM_ID;
    await bot.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('❌ sendTG error:', e?.message || e);
  }
}

// Chuyển thời gian từ DB bị +7h về đúng giờ thực
function fixDbDate(d) {
  if (!d) return null;
  const ms = new Date(d).getTime() + DB_OFFSET_FIX_HOURS * 3600 * 1000;
  return new Date(ms);
}

// Tolerance kiểm tra
function withinToleranceSec(diffSec, targetSec, tolSec = 30) {
  return Math.abs(diffSec - targetSec) <= tolSec;
}

/* ====== Xây thời điểm "hôm nay" theo giờ Bangkok nhưng ở UTC ms ====== */
function todayMidnightBkkUtcMs(nowMs = Date.now()) {
  const bkkMs = nowMs + BKK_OFFSET_MS; // shift sang BKK
  const d = new Date(bkkMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  // Midnight BKK (UTC ms) = midnight UTC của (y,m,day) rồi trừ offset BKK
  return Date.UTC(y, m, day) - BKK_OFFSET_MS;
}

function eventTodayBkkUtcMs(timeHHmm) {
  const [h, m] = timeHHmm.split(':').map(Number);
  return todayMidnightBkkUtcMs() + (h * 3600 + m * 60) * 1000;
}

function todaysBkkKey() {
  const bkkMs = Date.now() + BKK_OFFSET_MS;
  const d = new Date(bkkMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ===================== Checkers ===================== */
// Routine: trước 2 phút & đúng giờ (so theo UTC ms nhưng mốc là giờ BKK)
async function checkPersonalSchedule() {
  const pool = await poolPromise;
  const res = await pool.request()
    .query("SELECT Id, Title, Time FROM PersonalSchedule ORDER BY Time ASC");

  const schedules = res.recordset;

  const nowMs = Date.now();
  const nowSec = nowMs / 1000;
  const beforeSec = SCHEDULE_REMIND_BEFORE_MIN * 60;
  const tolSec = 30;
  const dayKey = todaysBkkKey();

  for (const item of schedules) {
    const evtMs = eventTodayBkkUtcMs(item.Time);
    const evtSec = evtMs / 1000;
    const diffSec = evtSec - nowSec;

    // Trước 5 phút
    if (withinToleranceSec(diffSec, beforeSec, tolSec)) {
      const key = `sched:${dayKey}:${item.Id}:before`;
      if (shouldSendOnce(key)) {
        await sendTG(`🕒 *Sắp tới* (${SCHEDULE_REMIND_BEFORE_MIN} phút nữa): _${item.Title}_ (${item.Time})`);
      }
    }

    // Đúng giờ
    if (withinToleranceSec(diffSec, 0, tolSec)) {
      const key = `sched:${dayKey}:${item.Id}:at`;
      if (shouldSendOnce(key)) {
        await sendTG(`🚀 *Đến giờ*: _${item.Title}_ (${item.Time})`);
      }
    }
  }
}

// Tasks: trước 30 phút & đúng giờ (deadline lấy từ DB, fix +7h, so trực tiếp epoch)
async function checkTasks() {
  const pool = await poolPromise;
  const res = await pool.request()
    .query(`SELECT Id, Title, Description, Deadline, Priority, CreatedAt, Status 
            FROM Tasks 
            WHERE Status = 'pending' AND Deadline IS NOT NULL`);

  const nowMs = Date.now();
  const nowSec = nowMs / 1000;
  const beforeSec = TASK_REMIND_BEFORE_MIN * 60;
  const tolSec = 30;

  for (const t of res.recordset) {
    const deadline = fixDbDate(t.Deadline);
    if (!deadline) continue;

    const dMs = deadline.getTime();
    const diffSec = (dMs - nowMs) / 1000;
    const diffDays = Math.floor(diffSec / 86400);

    // === Priority 4: từ khi add task, nếu còn <=20 ngày thì nhắc mỗi 5 ngày ===
    if (t.Priority === 4) {
      const created = fixDbDate(t.CreatedAt) || new Date();
      const daysSince = Math.floor((nowMs - created.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= 20 && daysSince % 5 === 0) {
        const key = `task:${t.Id}:prio4:${daysSince}`;
        if (shouldSendOnce(key, 86400)) { // cache 1 ngày
          await sendTG(`🚨 *Nhắc sớm (P4)*: _${t.Title}_\n🗓 Còn ${diffDays} ngày tới hạn\n📅 ${deadline.toLocaleDateString('vi-VN')}`);
        }
      }
    }

    // === Priority 5: từ khi tạo tới hạn, nhắc mỗi 10 ngày ===
    else if (t.Priority === 5) {
      const created = fixDbDate(t.CreatedAt) || new Date();
      const daysSince = Math.floor((nowMs - created.getTime()) / 86400000);
      if (daysSince % 10 === 0 && diffDays >= 0) {
        const key = `task:${t.Id}:prio5:${daysSince}`;
        if (shouldSendOnce(key, 86400)) {
          await sendTG(`🔴 *Nhắc định kỳ (P5)*: _${t.Title}_\n🗓 Còn ${diffDays} ngày tới hạn\n📅 ${deadline.toLocaleDateString('vi-VN')}`);
        }
      }
    }

    // === Các priority khác: logic cũ ===
    else {
      // Trước 30 phút
      if (withinToleranceSec(diffSec, beforeSec, tolSec)) {
        const key = `task:${t.Id}:before`;
        if (shouldSendOnce(key)) {
          await sendTG(`⏳ *Công việc sắp tới*: _${t.Title}_\n🕒 ${deadline.toLocaleString('vi-VN')}`);
        }
      }

      // Đúng giờ
      if (withinToleranceSec(diffSec, 0, tolSec)) {
        const key = `task:${t.Id}:at`;
        if (shouldSendOnce(key)) {
          await sendTG(`✅ *Đến hạn*: _${t.Title}_\n🕒 ${deadline.toLocaleString('vi-VN')}`);
        }
      }
    }
  }
}

/* ===================== Public API ===================== */
export const startReminderService = () => {
  // chạy mỗi 10 giây để bắt kịp tolerance ±30s
  cron.schedule('*/10 * * * * *', async () => {
    try {
      cleanupSentCache();
      await checkPersonalSchedule();
      await checkTasks();
    } catch (err) {
      console.error('❌ Reminder tick error:', err);
    }
  }, { timezone: 'Asia/Bangkok' });

  console.log('⏰ Reminder Service đã bật (tick mỗi 10s, TZ=Asia/Bangkok).');
};
