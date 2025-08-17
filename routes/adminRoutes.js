// routes/adminRoutes.js
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// POST /admin/login
router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Thiếu mật khẩu" });

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Sai mật khẩu" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// Middleware xác thực
function verifyAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Thiếu token" });
  const token = auth.split(" ")[1];

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Token không hợp lệ" });
  }
}

// GET /admin/config
router.get("/config", verifyAdmin, (req, res) => {
  const env = { ...process.env };

  // Danh sách các trường nhạy cảm không cho hiện ra
  const hiddenKeys = [
    "DB_PASSWORD",
    "JWT_SECRET",
    "ADMIN_PASSWORD"
  ];

  hiddenKeys.forEach(k => delete env[k]);

  res.json(env);
});

export default router;
