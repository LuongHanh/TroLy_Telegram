import { useEffect, useState } from "react";
import api from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#4CAF50", "#FFC107", "#F44336"]; // done, pending, overdue
const isValidTime = (t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingSched, setLoadingSched] = useState(true);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState({
    today: null,
    week: null,
    month: null,
    year: null,
  });

  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");

  /* ===== Fetch data ===== */
  const fetchTasks = () => {
    setLoadingTasks(true);
    api
      .get("/tasks/today/all")
      .then((res) => setTasks(res.data.results || res.data || []))
      .catch((e) => console.error("Load tasks error:", e))
      .finally(() => setLoadingTasks(false));
  };

  const fetchSchedule = () => {
    setLoadingSched(true);
    api
      .get("/personal-schedule")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        list.sort((a, b) => (a.Time || "").localeCompare(b.Time || ""));
        setSchedule(list);
      })
      .catch(() => setErr("Không tải được Thời gian biểu."))
      .finally(() => setLoadingSched(false));
  };

  const fetchStats = async () => {
    try {
      const now = new Date().toISOString().split("T")[0];
      const [today, week, month, year] = await Promise.all([
        api.get("/tasks/today/all"),
        api.get(`/tasks/week/${now}`),
        api.get(`/tasks/month/${now}`),
        api.get(`/tasks/year/${now}`),
      ]);

      const parseStats = (arr) => {
        const done = arr.filter(
          (t) => (t.Status || "").toLowerCase() === "done"
        ).length;
        const overdue = arr.filter((t) => {
          const d = new Date(t.Deadline);
          return d < new Date() && (t.Status || "").toLowerCase() !== "done";
        }).length;
        const pending = arr.length - done - overdue;
        return [
          { name: "Hoàn thành", value: done },
          { name: "Chưa xong", value: pending },
          { name: "Quá hạn", value: overdue },
        ];
      };

      setStats({
        today: parseStats(today.data || []),
        week: parseStats(week.data || []),
        month: parseStats(month.data || []),
        year: parseStats(year.data || []),
      });
    } catch (e) {
      console.error("Load stats error:", e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchSchedule();
    fetchStats();
  }, []);

  /* ===== CRUD Schedule ===== */
  const addSchedule = (e) => {
    e.preventDefault();
    setErr("");
    if (!newTitle.trim()) return setErr("Nhập tiêu đề.");
    if (!isValidTime(newTime))
      return setErr("Giờ không hợp lệ. Định dạng HH:mm.");

    api
      .post("/personal-schedule", { title: newTitle.trim(), time: newTime })
      .then((res) => {
        const item = res.data;
        setSchedule((prev) =>
          [...prev, item].sort((a, b) =>
            (a.Time || "").localeCompare(b.Time || "")
          )
        );
        setNewTitle("");
        setNewTime("");
      })
      .catch(() => setErr("Thêm mới thất bại."));
  };

  const startEdit = (item) => {
    setEditingId(item.Id);
    setEditTitle(item.Title);
    setEditTime(item.Time);
    setErr("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditTime("");
  };

  const saveEdit = (id) => {
    setErr("");
    if (!editTitle.trim()) return setErr("Nhập tiêu đề.");
    if (!isValidTime(editTime))
      return setErr("Giờ không hợp lệ. Định dạng HH:mm.");

    api
      .put(`/personal-schedule/${id}`, {
        title: editTitle.trim(),
        time: editTime,
      })
      .then((res) => {
        const updated = res.data;
        setSchedule((prev) =>
          prev
            .map((x) => (x.Id === id ? updated : x))
            .sort((a, b) => (a.Time || "").localeCompare(b.Time || ""))
        );
        cancelEdit();
      })
      .catch(() => setErr("Cập nhật thất bại."));
  };

  const deleteSchedule = (id) => {
    setErr("");
    api
      .delete(`/personal-schedule/${id}`)
      .then(() => setSchedule((prev) => prev.filter((x) => x.Id !== id)))
      .catch(() => setErr("Xoá thất bại."));
  };

  /* ===== Chart Card ===== */
  const GRADIENTS = [
    { id: "done", from: "#e5f500ff", to: "#00ff55ff" },      // xanh ngọc → xanh điện
    { id: "pending", from: "#fd7702ff", to: "#eef769ff" },   // vàng neon → hồng neon
    { id: "overdue", from: "#fb1919ff", to: "#5005feff" },   // đỏ rực → tím sáng
  ];

  const ChartBox = ({ title, data }) => {
    if (!data) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    const done = data.find((d) => d.name === "Hoàn thành")?.value || 0;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition flex flex-col items-center border">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="relative w-full h-52">
          <ResponsiveContainer>
            <PieChart>
              <defs>
                {GRADIENTS.map((g) => (
                  <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={g.from} />
                    <stop offset="100%" stopColor={g.to} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius="100%"
                innerRadius="65%"
                paddingAngle={2}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={`url(#${GRADIENTS[idx].id})`}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-extrabold text-gray-800">{percent}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Tasks hôm nay */}
      <section className="relative overflow-hidden p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-transform duration-300 border-l-8 border-green-600 bg-gradient-to-r from-green-400 via-emerald-300 to-green-200">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white drop-shadow-lg">
          📌 Tasks hôm nay
          <span className="text-sm font-normal bg-green-500 text-white px-3 py-1 rounded-full shadow">
            {tasks.length} task
          </span>
        </h2>

        {loadingTasks ? (
          <p className="text-gray-600 italic">⏳ Đang tải...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-600 font-medium">🎉 Không có task nào hôm nay</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t, idx) => (
              <li
                key={t.Id || idx}
                className="bg-white p-4 rounded-xl shadow-md flex justify-between items-center hover:shadow-lg hover:bg-green-50 transition cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {t.Title.charAt(0).toUpperCase() + t.Title.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    ⏰ Deadline: <span className="font-medium">{t.DeadlineFormatted}</span>
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium shadow ${
                    t.Status === "done"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  }`}
                >
                  {t.Status || "pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Biểu đồ tiến độ */}
      <section className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition">
        <h2 className="text-2xl font-bold mb-6">📊 Tiến độ công việc</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ChartBox title="Hôm nay" data={stats.today} />
          <ChartBox title="Tuần này" data={stats.week} />
          <ChartBox title="Tháng này" data={stats.month} />
          <ChartBox title="Năm nay" data={stats.year} />
        </div>
        <div className="flex justify-center mt-6 space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-sm" style={{
              backgroundImage: `linear-gradient(to bottom, ${GRADIENTS[0].from}, ${GRADIENTS[0].to})`,
            }}></span>
            <span>Hoàn thành</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-sm" style={{
              backgroundImage: `linear-gradient(to bottom, ${GRADIENTS[1].from}, ${GRADIENTS[1].to})`,
            }}></span>
            <span>Chưa xong</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-sm" style={{
              backgroundImage: `linear-gradient(to bottom, ${GRADIENTS[2].from}, ${GRADIENTS[2].to})`,
            }}></span>
            <span>Quá hạn</span>
          </div>
        </div>
      </section>

      {/* Lịch cá nhân */}
      <section className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition">
        <h2 className="text-2xl font-bold mb-4">🗓 Thời gian biểu cá nhân</h2>
        <form
          onSubmit={addSchedule}
          className="bg-gray-50 p-4 rounded-xl shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tiêu đề"
            className="border rounded-lg px-3 py-2 md:col-span-2"
          />
          <input
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            placeholder="HH:mm"
            className="border rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Thêm
          </button>
        </form>

        {err && <div className="text-red-600 mb-3">{err}</div>}

        {loadingSched ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : schedule.length === 0 ? (
          <p className="text-gray-500">Chưa có lịch cá nhân.</p>
        ) : (
          <ul className="space-y-3">
            {schedule.map((s, idx) => {
              const isEditing = editingId === s.Id;
              return (
                <li
                  key={s.Id || idx}
                  className="bg-gray-50 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        className="border rounded-lg px-3 py-2"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <input
                        className="border rounded-lg px-3 py-2"
                        value={editTime}
                        placeholder="HH:mm"
                        onChange={(e) => setEditTime(e.target.value)}
                      />
                      <div className="space-x-2">
                        <button
                          type="button"
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
                          onClick={() => saveEdit(s.Id)}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          className="bg-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 cursor-pointer"
                          onClick={cancelEdit}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold">{s.Title}</p>
                        <p className="text-sm text-gray-600">🕒 {s.Time}</p>
                      </div>
                      <div className="space-x-3">
                        <button
                          className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 cursor-pointer"
                          onClick={() => startEdit(s)}
                        >
                          Sửa
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 cursor-pointer"
                          onClick={() => deleteSchedule(s.Id)}
                        >
                          Xoá
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
