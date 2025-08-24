import { useEffect, useState } from "react";
import api from "../api";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Pencil, Trash2 } from "lucide-react";

const FILTERS = [
  { key: "today", label: "Hôm nay" },
  { key: "by-date", label: "Theo ngày" },
  { key: "week", label: "Theo tuần" },
  { key: "someday", label: "N ngày tới" },
];

const COLORS = ["#4CAF50", "#FFC107", "#F44336"]; // done, pending, quá hạn

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState(3);

  const [filter, setFilter] = useState("week");
  const [param, setParam] = useState(() => {
    // Lấy ngày hôm nay dạng YYYY-MM-DD
    return new Date().toISOString().split("T")[0];
  });

  // ==== EDIT STATE ====
  const [editingId, setEditingId] = useState(null);
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eDeadline, setEDeadline] = useState("");
  const [ePriority, setEPriority] = useState(3);

  // ==== STATE TASK CỐ ĐỊNH ====
  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rStart, setRStart] = useState("");        // ngày bắt đầu
  const [rCount, setRCount] = useState(1);         // số lần (số ngày/tuần/tháng)
  const [rUnit, setRUnit] = useState("day");       // đơn vị
  const [rHour, setRHour] = useState("");          // giờ deadline mỗi ngày (HH:mm)
  const [addingRecurring, setAddingRecurring] = useState(false);
  const [message, setMessage] = useState("");

  const pad = (n) => String(n).padStart(2, "0");

  // Tạo Date local từ "YYYY-MM-DD"
  const parseLocalDate = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
  };

  // Format Date -> "YYYY-MM-DD HH:mm:ss" (local)
  const toSqlLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

  const addRecurringTask = async (e) => {
    e.preventDefault();

    if (!window.confirm("Bạn có chắc muốn thêm công việc cố định này?")) return;

    setAddingRecurring(true);
    setMessage("⏳ Đang thêm...");

    try {
      const base = parseLocalDate(rStart); // local 00:00
      const [hh, mm] = (rHour || "00:00").split(":").map(Number);

      // ✅ Quy đổi tất cả về NGÀY
      const count = Math.max(1, Number(rCount) || 1);
      let totalDays = count;

      if (rUnit === "week") {
        totalDays = count * 7;
      } else if (rUnit === "month") {
        // Tính số ngày thực sự của N tháng kể từ ngày bắt đầu
        const endExclusive = new Date(base.getFullYear(), base.getMonth() + count, base.getDate());
        endExclusive.setHours(0, 0, 0, 0);
        totalDays = Math.max(1, Math.round((endExclusive - base) / 86400000));
      }

      const tasksToAdd = [];
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i); // chạy từng NGÀY
        d.setHours(hh, mm, 0, 0);      // giữ giờ local cố định

        tasksToAdd.push({
          title: rTitle,
          description: rDesc,
          deadline: toSqlLocal(d), // "YYYY-MM-DD HH:mm:ss" local
          priority: 3,
        });
      }

      await api.post("/tasks/bulk", { tasks: tasksToAdd });

      const endDate = tasksToAdd[tasksToAdd.length - 1].deadline.split(" ")[0];
      setMessage(
        `✅ Đã thêm thành công "${rTitle}", deadline ${pad(hh)}:${pad(mm)} mỗi ngày từ ${rStart} đến ${endDate}, công việc sẽ diễn ra trong ${totalDays} ngày.`
      );

      // reset form
      setRTitle(""); setRDesc(""); setRStart("");
      setRCount(1); setRUnit("day"); setRHour("");

      fetchTasks();
    } catch (err) {
      console.error("Lỗi thêm task cố định:", err.response?.data || err);
      setMessage("❌ Lỗi khi thêm task cố định!");
    } finally {
      setAddingRecurring(false);
    }
  };

  // 'YYYY-MM-DDTHH:mm' cho <input type="datetime-local">
  const toInputDT = (val) => {
    if (!val) return "";

    let d;

    // Nếu là chuỗi từ SQL Server: yyyy-MM-dd HH:mm:ss
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) {
      d = new Date(val.replace(" ", "T"));
    } else {
      d = new Date(val);
    }

    if (Number.isNaN(d.getTime())) return "";

    // HTML5 datetime-local cần local-naive -> khử offset
    const localNaive = new Date(d.getTime() - d.getTimezoneOffset() * 60000);

    // Xuất dạng YYYY-MM-DDTHH:mm
    return localNaive.toISOString().slice(0, 16);
  };

  const startEdit = (task) => {
    setEditingId(task.Id);
    setETitle(task.Title || "");
    setEDesc(task.Description || "");
    // Ưu tiên Deadline (ISO) → nếu không parse được thì để trống cho user chọn lại
    setEDeadline(toInputDT(task.DeadlineStr || task.DeadlineFormatted));
    setEPriority(Number(task.Priority ?? 3));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setETitle("");
    setEDesc("");
    setEDeadline("");
    setEPriority(3);
  };

  const saveEdit = (task) => {
    api.put(`/tasks/${task.Id}`, {
      title: eTitle.trim() || task.Title,
      description: eDesc,
      // nếu user không chọn lại, giữ nguyên deadline cũ
      deadline: eDeadline ? formatDeadline(eDeadline) : (task.DeadlineStr || task.Deadline),
      priority: Number(ePriority),
      status: task.Status || "pending",
    })
    .then(() => {
      cancelEdit();
      fetchTasks();
    })
    .catch(err => console.error("Lỗi cập nhật task:", err.response?.data || err));
  };

  const fetchTasks = () => {
    let url = "";
    if (filter === "today") url = "/tasks/today/all";
    else if (filter === "by-date") url = `/tasks/by-date/${param}`;
    else if (filter === "week") url = `/tasks/week/${param}`;
    else if (filter === "someday") url = `/tasks/someday/${param}`;

    api.get(url)
      .then(res => setTasks(res.data || []))
      .catch(err => console.error("Lỗi load tasks:", err));
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, param]);

  const formatDeadline = (val) => {
    if (!val) return null;
    return val.replace("T", " ") + ":00";
  };

  const addTask = (e) => {
    e.preventDefault();
    api.post("/tasks", {
      title,
      description,
      deadline: formatDeadline(deadline),
      priority,
    })
      .then(() => {
        setTitle("");
        setDescription("");
        setDeadline("");
        setPriority(3);
        fetchTasks();
      })
      .catch(err => console.error("Lỗi thêm task:", err.response?.data || err));
  };

  const deleteTask = (id) => {
    api.delete(`/tasks/${id}`)
      .then(() => fetchTasks())
      .catch(err => console.error("Lỗi xoá task:", err));
  };

  const toggleStatus = (task) => {
    const newStatus = (task.Status || "").toLowerCase() === "done" ? "pending" : "done";
    api.put(`/tasks/${task.Id}`, {
      title: task.Title,
      description: task.Description,
      deadline: task.DeadlineStr || task.Deadline,
      priority: task.Priority,
      status: newStatus
    })
      .then(() => fetchTasks())
      .catch(err => console.error("Lỗi cập nhật status:", err.response?.data || err));
  };

  // ==== ĐÁNH GIÁ ====
  const doneCount = tasks.filter(t => (t.Status || "").toLowerCase() === "done").length;
  const pendingCount = tasks.filter(t => (t.Status || "").toLowerCase() !== "done").length;
  const now = new Date();
  const overdueCount = tasks.filter(t => {
    if (!t.DeadlineStr) return false;

    // t.DeadlineStr = "2025-08-20 10:00:00"
    const [datePart, timePart] = t.DeadlineStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split(":").map(Number);

    // new Date(year, monthIndex, day, hour, minute, second) => Local time
    const d = new Date(year, month - 1, day, hour, minute, second);

    return d < now && (t.Status || "").toLowerCase() !== "done";
  }).length;

  const total = tasks.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const chartData = [
    { name: "Hoàn thành", value: doneCount },
    { name: "Chưa xong", value: pendingCount - overdueCount },
    { name: "Quá hạn", value: overdueCount },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Tiêu đề */}
      <h2 className="text-3xl font-bold text-gray-800">📋 Quản lý Tasks</h2>

      {/* Form thêm task */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">➕ Thêm Task mới</h3>
        <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Tên task..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
            required
          />
          <input
            type="text"
            placeholder="Mô tả..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          />
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer"
          />
          <select
            value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer"
          >
            <option value={1}>Ít quan trọng</option>
            <option value={2}>Khá quan trọng</option>
            <option value={3}>Quan trọng</option>
            <option value={4}>Cần làm ngay</option>
            <option value={5}>Cần chú ý</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-600 transition cursor-pointer"
          >
            Thêm
          </button>
        </form>
      </div>

      {/* Form thêm task cố định */}
      <div className="bg-green-50 rounded-xl shadow p-4 mt-6">
        <h3 className="text-base font-semibold mb-3">🔁 Task Cố Định</h3>
        <form onSubmit={addRecurringTask} className="p-4 bg-white rounded-xl shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            className="border rounded-lg p-2 w-full"
            placeholder="Tên công việc"
            value={rTitle}
            onChange={(e) => setRTitle(e.target.value)}
            required
          />
          <input
            type="text"
            className="border rounded-lg p-2 w-full"
            placeholder="Mô tả"
            value={rDesc}
            onChange={(e) => setRDesc(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="date"
            className="border rounded-lg p-2 w-full"
            value={rStart}
            onChange={(e) => setRStart(e.target.value)}
            required
          />
          <input
            type="time"
            className="border rounded-lg p-2 w-full"
            value={rHour}
            onChange={(e) => setRHour(e.target.value)}
            required
          />
          <input
            type="number"
            min="1"
            className="border rounded-lg p-2 w-full"
            value={rCount}
            onChange={(e) => setRCount(e.target.value)}
            required
          />
          <select
            className="border rounded-lg p-2 w-full"
            value={rUnit}
            onChange={(e) => setRUnit(e.target.value)}
          >
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={addingRecurring}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition"
          >
            {addingRecurring ? "Đang thêm..." : "Thêm"}
          </button>
        </div>

        {message && <p className="text-sm text-gray-600">{message}</p>}
      </form>
      </div>

      {/* Chart + filter + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-2xl shadow p-4 flex flex-col items-center justify-center lg:col-span-1">
          <h4 className="font-semibold mb-2">Tình trạng Tasks</h4>
          {total > 0 ? (
            <div className="h-64 w-full max-w-xs mx-auto">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={COLORS[idx % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 mt-8">Chưa có dữ liệu để hiển thị</p>
          )}
        </div>

        {/* Stats + Filter */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4 lg:col-span-2">
          <p className="text-lg font-semibold">
            ✅ Hoàn thành: {doneCount}/{total} ({percent}%)
          </p>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Bộ lọc */}
          <div className="flex flex-wrap gap-3 mt-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border p-2 rounded-lg cursor-pointer"
            >
              {FILTERS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>

            {filter === "someday" && (
              <input
                type="number"
                value={param}
                onChange={e => setParam(e.target.value)}
                placeholder="Số ngày"
                className="border p-2 rounded-lg w-32"
              />
            )}
            {(filter === "by-date" || filter === "week") && (
              <input
                type="date"
                value={param}
                onChange={e => setParam(e.target.value)}
                className="border p-2 rounded-lg"
              />
            )}

            <button
              onClick={fetchTasks}
              className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 cursor-pointer"
            >
              🔄 Tải lại
            </button>
          </div>

          {/* Nhận xét động */}
          {total === 0 ? (
            <p className="mt-16 text-gray-500 italic">⚠️ Không có task nào với bộ lọc hiện tại.</p>
          ) : (
            <p className="mt-16 text-gray-700 italic">
              {percent === 0 && "🚀 Bắt đầu thôi nào!"}
              {percent > 0 && percent < 50 && "⚡ Cố lên, bạn đã đi được một đoạn rồi."}
              {percent >= 50 && percent < 100 && "🔥 Sắp tới đích, cố thêm chút nữa!"}
              {percent === 100 && "🎉 Xuất sắc! Bạn đã hoàn thành toàn bộ."}
            </p>
          )}
        </div>
      </div>


      {/* Danh sách task */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-semibold mb-4">Danh sách Tasks</h3>
        {tasks.length === 0 ? (
          <p className="text-gray-500">Chưa có task nào.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t, idx) => (
              <li
                key={t.Id || idx}
                className="border rounded-xl p-4 hover:shadow-md transition"
              >
                {editingId === t.Id ? (
                  // ====== EDIT MODE ======
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
                    <input
                      className="border rounded-lg p-2 md:col-span-2"
                      value={eTitle}
                      onChange={(e) => setETitle(e.target.value)}
                      placeholder="Tên task"
                    />
                    <input
                      className="border rounded-lg p-2 md:col-span-2"
                      value={eDesc}
                      onChange={(e) => setEDesc(e.target.value)}
                      placeholder="Mô tả"
                    />
                    <input
                      type="datetime-local"
                      className="border rounded-lg p-2"
                      value={eDeadline}
                      onChange={(e) => setEDeadline(e.target.value)}
                    />
                    <select
                      className="border rounded-lg p-2"
                      value={ePriority}
                      onChange={(e) => setEPriority(Number(e.target.value))}
                    >
                      <option value={1}>Ít quan trọng</option>
                      <option value={2}>Khá quan trọng</option>
                      <option value={3}>Quan trọng</option>
                      <option value={4}>Cần làm ngay</option>
                      <option value={5}>Cần chú ý</option>
                    </select>

                    <div className="flex gap-2 md:col-span-5">
                      <button
                        onClick={() => saveEdit(t)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
                      >
                        💾 Lưu
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  // ====== VIEW MODE ======
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={(t.Status || "").toLowerCase() === "done"}
                        onChange={() => toggleStatus(t)}
                        className="h-5 w-5 accent-green-500 cursor-pointer mt-1"
                      />
                      <div>
                        <p className={`font-semibold ${(t.Status || "").toLowerCase() === "done" ? "line-through text-gray-500" : ""}`}>
                          {t.Title}
                        </p>
                        <p className="text-sm text-gray-600">
                          Deadline: {t.DeadlineFormatted || t.Deadline}
                        </p>
                        {t.Description && (
                          <p className="text-sm text-gray-500">Mô tả: {t.Description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                      <span
                        className={`text-sm px-2 py-1 rounded-lg font-medium shrink-0
                          ${t.Priority === 5 ? "bg-fuchsia-100 text-fuchsia-700"
                            : t.Priority === 4 ? "bg-red-100 text-red-700"
                            : t.Priority === 3 ? "bg-orange-100 text-orange-700"
                            : t.Priority === 2 ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"}`}
                      >
                        {t.PriorityLabel || `P${t.Priority}`}
                      </span>

                      <span
                        className={`text-sm px-2 py-1 rounded-lg shrink-0 ${
                          (t.Status || "").toLowerCase() === "done"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {t.Status || "pending"}
                      </span>

                      <button
                        onClick={() => startEdit(t)}
                        className="inline-flex items-center justify-center gap-1 sm:gap-2 h-9 px-3 sm:px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 shrink-0"
                        aria-label="Sửa"
                        title="Sửa"
                      >
                        <Pencil size={16} />
                        <span className="hidden sm:inline">Sửa</span>
                      </button>

                      <button
                        onClick={() => deleteTask(t.Id)}
                        className="inline-flex items-center justify-center gap-1 sm:gap-2 h-9 px-3 sm:px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 shrink-0"
                        aria-label="Xoá"
                        title="Xoá"
                      >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Xoá</span>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
