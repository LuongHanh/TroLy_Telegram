import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { LayoutDashboard, CheckSquare, Folder, Shield, Menu, X } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Files from "./pages/Files";
import Admin from "./pages/Admin";

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-gray-100">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-screen w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 z-50
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        >
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Trợ lý Web - Tele</h1>
            <button
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
            <NavItem to="/" icon={<LayoutDashboard size={18} />}>Dashboard</NavItem>
            <NavItem to="/tasks" icon={<CheckSquare size={18} />}>Tasks</NavItem>
            <NavItem to="/files" icon={<Folder size={18} />}>Files</NavItem>
            <NavItem to="/admin" icon={<Shield size={18} />}>Admin</NavItem>
          </nav>

          <div className="p-4 border-t border-gray-700 text-sm text-gray-400 space-y-1">
            <p>Developer: Lường Văn Hạnh</p>
            <p>Chuyên ngành: <br/> - Kỹ thuật phần mềm</p>
            <p>Trường:<br/> - ĐH KTCN Thái Nguyên</p>
            <p>Email: <br/> - luongvanhanh0402@gmail.com</p>
            <p>© 2025 Trợ lý Web - Telegram</p>
          </div>
        </aside>

        {/* Overlay (mobile khi mở menu) */}
        {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)}></div>}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto md:ml-64 pt-16 md:pt-0">
          {/* Header chỉ hiện trên mobile */}
          <div className="fixed top-0 left-0 right-0 z-30 bg-white shadow md:hidden flex items-center justify-between p-4">
            <h2 className="font-bold text-lg">Trợ lý Web - Telegram</h2>
            <button onClick={() => setOpen(true)}>
              <Menu size={24} />
            </button>
          </div>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/files" element={<Files />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

/** 🔗 Component NavItem */
function NavItem({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-yellow-400 text-gray-900 font-medium"
            : "text-gray-300 hover:bg-gray-800 hover:text-white"
        }`
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}
