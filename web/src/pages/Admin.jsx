// src/pages/Admin.jsx
import { useEffect, useState } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import apiAdmin from "../apiAdmin";

export default function Admin() {
  const [token, setToken] = useState(sessionStorage.getItem("adminToken") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const fetchConfig = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiAdmin.get("/admin/config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfig(res.data);
    } catch (e) {
      console.error(e);
      setError("Không lấy được config. Có thể token hết hạn.");
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiAdmin.post("/admin/login", { password });
      sessionStorage.setItem("adminToken", res.data.token);
      setToken(res.data.token);
      setPassword("");
      fetchConfig();
    } catch (e) {
      setError(e.response?.data?.error || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("adminToken");
    setToken("");
    setConfig(null);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 px-4">
        <form
          onSubmit={login}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6 border border-gray-100 animate-fadeIn"
        >
          <div className="flex justify-center">
            <div className="bg-blue-600 text-white p-4 rounded-full shadow-lg">🔒</div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800">
            Đăng nhập Admin
          </h2>
          <p className="text-center text-gray-500 text-sm">
            Vui lòng nhập mật khẩu để tiếp tục
          </p>

          <div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded-lg px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 shadow-sm"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center font-medium">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition cursor-pointer shadow-md flex items-center justify-center"
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    );
  }

  const adminKeys = ["BOT_TOKEN", "MY_TELEGRAM_ID", "DRIVE_FOLDER_ID", "TELEGRAM_USER"];
  const adminConfig = {};
  const systemConfig = {};
  if (config) {
    Object.entries(config).forEach(([k, v]) => {
      if (adminKeys.includes(k)) adminConfig[k] = v;
      else systemConfig[k] = v;
    });
  }

  return (
    <div className="space-y-8 mx-4 my-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h2 className="text-2xl font-bold">⚙️ Trang Admin</h2>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 cursor-pointer self-start md:self-auto"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">⏳ Đang tải config...</div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {/* Admin info */}
          <section className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-xl font-semibold mb-3">👤 Thông tin Admin</h3>
            {/* Laptop */}
            <div className="hidden md:block">
              {Object.keys(adminConfig).length === 0 ? (
                <p className="text-gray-500">Không có dữ liệu.</p>
              ) : (
                <table className="min-w-full border rounded-lg overflow-hidden">
                  <tbody>
                    {Object.entries(adminConfig).map(([k, v]) => (
                      <tr key={k} className="border-b last:border-0 even:bg-gray-50">
                        <td className="px-4 py-2 font-medium w-1/4">{k}</td>
                        <td className="px-4 py-2 text-gray-700 break-all">{v}</td>
                        <td className="px-4 py-2 text-right w-20">
                          <button
                            onClick={() => handleCopy(v, k)}
                            className={`flex items-center gap-1 text-sm px-2 py-1 rounded cursor-pointer ${
                              copiedKey === k
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {copiedKey === k ? <Check size={14} /> : <Copy size={14} />}
                            {copiedKey === k ? "Copied" : "Copy"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3 max-h-[400px] overflow-y-auto">
              {Object.entries(adminConfig).map(([k, v]) => (
                <div
                  key={k}
                  className="p-3 rounded-lg border shadow-sm bg-gray-50 flex flex-col"
                >
                  <span className="font-medium">{k}</span>
                  <span className="text-sm text-gray-600 break-words">{v}</span>
                  <button
                    onClick={() => handleCopy(v, k)}
                    className={`mt-2 self-end text-xs px-2 py-1 rounded cursor-pointer ${
                      copiedKey === k
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {copiedKey === k ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* System info */}
          <section className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-xl font-semibold mb-3">💻 Thông tin Hệ thống</h3>
            {/* Laptop */}
            <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border">
              <table className="min-w-full">
                <tbody>
                  {Object.entries(systemConfig).map(([k, v]) => (
                    <tr key={k} className="border-b last:border-0 even:bg-gray-50">
                      <td className="px-4 py-2 font-medium w-1/4">{k}</td>
                      <td className="px-4 py-2 text-gray-700 break-all">{v}</td>
                      <td className="px-4 py-2 text-right w-20">
                        <button
                          onClick={() => handleCopy(v, k)}
                          className={`flex items-center gap-1 text-sm px-2 py-1 rounded cursor-pointer ${
                            copiedKey === k
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {copiedKey === k ? <Check size={14} /> : <Copy size={14} />}
                          {copiedKey === k ? "Copied" : "Copy"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3 max-h-[500px] overflow-y-auto">
              {Object.entries(systemConfig).map(([k, v]) => (
                <div
                  key={k}
                  className="p-3 rounded-lg border shadow-sm bg-gray-50 flex flex-col"
                >
                  <span className="font-medium">{k}</span>
                  <span className="text-sm text-gray-600 break-words">{v}</span>
                  <button
                    onClick={() => handleCopy(v, k)}
                    className={`mt-2 self-end text-xs px-2 py-1 rounded cursor-pointer ${
                      copiedKey === k
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {copiedKey === k ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
