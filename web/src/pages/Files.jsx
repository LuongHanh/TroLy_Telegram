// src/pages/Files.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Globe,
  HardDrive,
  Copy,
  Check,
  Loader2,
  Clock,
} from "lucide-react";
import api from "../api";

const MODES = [
  { key: "keyword", label: "Từ khóa (keyword)" },
  { key: "time", label: "Theo thời gian (time)" },
  { key: "description", label: "Theo mô tả (description)" },
  { key: "parent", label: "Theo thư mục cha (parent)" },
  { key: "type", label: "Theo loại file (type/extension)" },
];

export default function Files() {
  const [mode, setMode] = useState(MODES[0].key);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const placeholder = useMemo(() => {
    switch (mode) {
      case "keyword":
        return "vd: báo cáo, bài giảng…";
      case "time":
        return "vd: hôm nay, tuần trước, 05/2024…";
      case "description":
        return "vd: mô tả đường dẫn/tên tệp…";
      case "parent":
        return "vd: Tài liệu cá nhân…";
      case "type":
        return "vd: pdf, word, ảnh, excel…";
      default:
        return "";
    }
  }, [mode]);

  /* ============= Search ============= */
  const search = async () => {
    setLoading(true);
    setError("");
    setList([]);
    try {
      if (!q.trim()) {
        setList([]);
        return;
      }
      const { data } = await api.get(
        `/files/${mode}/${encodeURIComponent(q.trim())}`
      );
      const results = data?.results ?? data ?? [];
      setList(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error(e);
      setError("Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (q.trim()) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const onSubmit = (e) => {
    e.preventDefault();
    search();
  };

  /* ============= History ============= */
  useEffect(() => {
    const raw = localStorage.getItem("fileHistory");
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const openFile = (file, type = "web") => {
    let url = "";
    if (type === "web") {
      url =
        file.webUrl ||
        (file.id ? `https://drive.google.com/file/d/${file.id}/view` : "");
    } else if (type === "local" && file.localPath) {
      url = `file:///${file.localPath.replace(/\\/g, "/")}`;
    }
    if (url) {
      window.open(url, "_blank");
      addHistory(file);
    }
  };

  const addHistory = (file) => {
    const now = new Date();
    const item = {
      id: file.id || Date.now(),
      name: file.name || "(không tên)",
      path: file.path || "",
      webUrl:
        file.webUrl ||
        (file.id ? `https://drive.google.com/file/d/${file.id}/view` : ""),
      localPath: file.localPath || "",
      openedAt: now.toISOString(),
    };

    let newHist = [item, ...history.filter((h) => h.id !== item.id)];
    newHist = newHist.slice(0, 50);
    setHistory(newHist);
    localStorage.setItem("fileHistory", JSON.stringify(newHist));
  };

  const history7days = history.filter((h) => {
    const diff =
      (Date.now() - new Date(h.openedAt).getTime()) / (1000 * 3600 * 24);
    return diff <= 7;
  });

  /* ============= Copy ============= */
  const handleCopy = async (f) => {
    try {
      await navigator.clipboard.writeText(
        "E:/" + f.path.replace("DataBackup", "DataAutoBackup") || ""
      );
      setCopiedId(
        f.id || "E:/" + f.path.replace("DataBackup", "DataAutoBackup")
      );
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  /* ============= UI ============= */
  return (
    <div className="m-5 p-4 md:p-6 space-y-10">
      <h2 className="text-3xl font-bold">📂 Quản lý & Tìm kiếm File</h2>

      {/* Form */}
      <form
        onSubmit={onSubmit}
        className="flex flex-col md:flex-row gap-3 bg-white p-5 rounded-2xl shadow"
      >
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border rounded-lg px-3 py-2 cursor-pointer focus:ring-blue-400 outline-none focus:ring-2"
        >
          {MODES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="border rounded-lg px-3 py-2 flex-1 focus:ring-blue-400 outline-none focus:ring-2"
        />

        <button
          type="submit"
          className="bg-blue-600 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading ? "Đang tìm..." : "Tìm"}
        </button>
      </form>

      {error && <div className="text-red-600">{error}</div>}

      {/* Kết quả */}
      {!loading && !error && (
        list.length === 0 ? (
          <p className="text-gray-500">Không có kết quả.</p>
        ) : (
          <>
            {/* Bảng desktop */}
            <div className="hidden md:block overflow-x-auto max-w-full">
              <div className="max-h-96 overflow-y-auto shadow">
                <table className="w-full table-auto bg-white">
                  <thead className="sticky top-0 bg-gray-100 text-left z-10">
                    <tr>
                      <th className="px-4 py-3 w-1/5">Tên</th>
                      <th className="px-4 py-3 w-2/5">Đường dẫn</th>
                      <th className="px-4 py-3 w-1/5">ID</th>
                      <th className="px-4 py-3 w-1/12">Loại</th>
                      <th className="px-4 py-3 w-1/5">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="border">
                    {list.slice(0, 500).map((f, idx) => {
                      let ext = "";
                      if (f.name?.includes(".")) {
                        ext = f.name.split(".").pop().toLowerCase();
                      } else if (f.mimeType) {
                        const mt = f.mimeType;
                        if (mt.startsWith("application/vnd.google-apps")) {
                          switch (mt) {
                            case "application/vnd.google-apps.document":
                              ext = "docx";
                              break;
                            case "application/vnd.google-apps.spreadsheet":
                              ext = "xlsx";
                              break;
                            case "application/vnd.google-apps.presentation":
                              ext = "pptx";
                              break;
                            default:
                              ext = "gdrive";
                          }
                        } else {
                          const parts = mt.split("/");
                          if (parts.length > 1) ext = parts[1].toLowerCase();
                        }
                      }

                      return (
                        <tr
                          key={
                            f.id ||
                            `${f.path.replace("DataBackup", "DataAutoBackup")}-${idx}`
                          }
                          className={`border-b last:border-0 hover:bg-gray-50 transition ${
                            idx % 2 === 0 ? "bg-gray-50/30" : "bg-white"
                          }`}
                        >
                          <td
                            className="px-4 py-3 font-medium max-w-[200px] truncate cursor-pointer"
                            title={f.name}
                            onClick={() => alert(f.name)}
                          >
                            {f.name || "(không tên)"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 max-w-[240px] truncate"
                            title={
                              "E:/" +
                              f.path.replace("DataBackup", "DataAutoBackup")
                            }
                          >
                            {"E:/" +
                              f.path.replace("DataBackup", "DataAutoBackup") ||
                              ""}
                          </td>
                          <td
                            className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]"
                            title={f.id}
                          >
                            {f.id || ""}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase">
                              {ext || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                            <button
                              onClick={() => openFile(f, "web")}
                              className="flex items-center gap-1 px-2 py-1 border rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            >
                              <Globe size={14} /> Web
                            </button>
                            {f.localPath && (
                              <button
                                onClick={() => openFile(f, "local")}
                                className="flex items-center gap-1 px-2 py-1 border rounded-lg text-green-600 hover:bg-green-50 transition cursor-pointer"
                              >
                                <HardDrive size={14} /> Local
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(f)}
                              className={`flex items-center gap-1 px-2 py-1 border rounded-lg transition cursor-pointer
                                ${
                                  copiedId ===
                                  (f.id ||
                                    "E:/" +
                                      f.path.replace("DataBackup", "DataAutoBackup"))
                                    ? "bg-green-100 text-green-700 border-green-300"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                              {copiedId ===
                              (f.id ||
                                "E:/" +
                                  f.path.replace("DataBackup", "DataAutoBackup")) ? (
                                <>
                                  <Check size={14} /> Copy
                                </>
                              ) : (
                                <>
                                  <Copy size={14} /> Path
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Tổng: {list.length.toLocaleString()}{" "}
                {list.length > 500 && "(chỉ hiển thị 500 dòng đầu)"}
              </div>
            </div>

            {/* Mobile list */}
            <div className="md:hidden">
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {list.slice(0, 100).map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="p-3 bg-white rounded-xl shadow flex justify-between items-center"
                  >
                    <span
                      className="font-medium truncate cursor-pointer"
                      title={f.name}
                      onClick={() => alert(f.name)}
                    >
                      {f.name || "(không tên)"}
                    </span>
                    <button
                      onClick={() => openFile(f, "web")}
                      className="ml-2 flex items-center gap-1 px-2 py-1 border rounded-lg text-blue-600 hover:bg-blue-50 text-sm cursor-pointer"
                    >
                      <Globe size={14} /> Mở
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}

      {/* History */}
      <section>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5" /> Lịch sử file đã mở (7 ngày qua)
        </h2>
        {history7days.length === 0 ? (
          <p className="text-gray-500">Chưa có lịch sử.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history7days.slice(0, 50).map((h, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-xl shadow hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="min-w-0 mb-2">
                  <p className="font-medium truncate" title={h.name}>
                    {h.name}
                  </p>
                  <p
                    className="text-xs text-gray-500 truncate"
                    title={
                      "E:/" + h.path.replace("DataBackup", "DataAutoBackup")
                    }
                  >
                    {"E:/" + h.path.replace("DataBackup", "DataAutoBackup")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(h.openedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {h.webUrl && (
                    <button
                      onClick={() => window.open(h.webUrl, "_blank")}
                      className="flex-1 min-w-[70px] px-2 py-1 border rounded-lg text-blue-600 hover:bg-blue-50 text-sm cursor-pointer"
                    >
                      Web
                    </button>
                  )}
                  {h.localPath && (
                    <button
                      onClick={() =>
                        window.open(
                          `file:///${h.localPath.replace(/\\/g, "/")}`
                        )
                      }
                      className="flex-1 min-w-[70px] px-2 py-1 border rounded-lg text-green-600 hover:bg-green-50 text-sm cursor-pointer"
                    >
                      Local
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
