// server.js
import express from 'express';
import cors from "cors";
import 'dotenv/config';
import scheduleController from './controllers/scheduleController.js';
import fileController from './controllers/fileController.js';
import personalScheduleController from './controllers/personalScheduleController.js'
import adminRoutes from "./routes/adminRoutes.js";
import { launchBot } from './telegram/bot.js';
import { manageCache } from './tools/cacheManager.js'
import { startReminderService } from './services/reminderService.js';

const app = express();
app.use(express.json());
app.use(cors());

// API Controllers
app.use('/api/files', fileController);
app.use('/api/tasks', scheduleController);
app.use('/api/personal-schedule', personalScheduleController);
app.use("/admin", adminRoutes);

launchBot(); // Khởi động Telegram Bot
manageCache(); // Chạy quản lý cache
startReminderService(); // Chạy lịch nhắc nhở

app.get("/api/ping", (req, res) => {  //ping đánh thức render
  res.json({ status: "ok", time: new Date() });
});

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ở http://localhost:${PORT}`);
});
