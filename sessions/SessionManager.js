// sessions/sessionManager.js
import fs from 'fs/promises';
import path from 'path';

const SESSION_FILE = path.join('./cache', 'sessions.json');

// Đọc file sessions
async function readSessions() {
  try {
    const raw = await fs.readFile(SESSION_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Ghi file sessions
async function writeSessions(data) {
  await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
  await fs.writeFile(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Lưu session mới hoặc cập nhật
export async function saveSession(userId, sessionData) {
  const sessions = await readSessions();
  const oldSession = sessions[userId] || {};
  sessions[userId] = {
    ...oldSession, // giữ lại dữ liệu cũ
    ...sessionData, // ghi đè dữ liệu mới
    updatedAt: Date.now()
  };
  await writeSessions(sessions);
}

// Lấy session
export async function getSession(userId) {
  const sessions = await readSessions();
  return sessions[userId] || null;
}

// Xóa session
export async function clearSession(userId) {
  const sessions = await readSessions();
  delete sessions[userId];
  await writeSessions(sessions);
}

// Xóa session cũ (quá hạn)
export async function cleanupSessions(maxAgeMinutes = 30) {
  const sessions = await readSessions();
  const now = Date.now();
  let changed = false;
  for (const [uid, data] of Object.entries(sessions)) {
    if (now - (data.updatedAt || 0) > maxAgeMinutes * 60 * 1000) {
      delete sessions[uid];
      changed = true;
    }
  }
  if (changed) {
    await writeSessions(sessions);
  }
}
