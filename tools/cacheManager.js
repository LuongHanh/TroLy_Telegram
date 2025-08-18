// tools/cacheManager.js
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

const CACHE_DIR = './cache';
const RESULT_FILE = path.join(CACHE_DIR, 'result.json');
const FOLDERS_FILE = path.join(CACHE_DIR, 'folders.json');

const TTL_RESULT_HOURS = 6;

let countdownState = {
  result: { lastModified: Date.now(), ttl: TTL_RESULT_HOURS * 3600 * 1000, file: RESULT_FILE },
};

// Ghi dữ liệu rỗng {}
async function clearFile(filePath) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '{}', 'utf-8');
    console.log(`✅ result.json đã reset lúc ${new Date().toLocaleString('vi-VN')}`);
  } catch (err) {
    console.error(`❌ Lỗi khi reset file ${filePath}:`, err);
  }
}

// Lấy mtime ban đầu
async function getFileMTime(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    return Date.now();
  }
}

// Quản lý reset file result.json
async function scheduleResultReset() {
  countdownState.result.lastModified = await getFileMTime(RESULT_FILE);

  const interval = countdownState.result.ttl;
  setInterval(() => clearFile(countdownState.result.file), interval);

  // chạy ngay lần đầu nếu file quá hạn
  const now = Date.now();
  if (now - countdownState.result.lastModified >= interval) {
    await clearFile(countdownState.result.file);
    countdownState.result.lastModified = now;
  }
}

// Rebuild folders.json lúc 03:00
function scheduleFoldersRebuild() {
  const now = new Date();
  let next3AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0);
  if (now >= next3AM) next3AM.setDate(next3AM.getDate() + 1);

  const msUntil3AM = next3AM - now;
  console.log(`⏳ Sẽ rebuild folders.json vào lúc ${next3AM.toLocaleString('vi-VN')}`);

  setTimeout(() => {
    rebuildFoldersJson();
    setInterval(rebuildFoldersJson, 24 * 3600 * 1000);
  }, msUntil3AM);
}

// Hàm rebuild
function rebuildFoldersJson() {
  console.log(`🚀 Rebuild folders.json lúc ${new Date().toLocaleString('vi-VN')}...`);
  exec('node tools/buildFolderCache.js', (err, stdout) => {
    if (err) {
      console.error('❌ Lỗi rebuild folders.json:', err);
      return;
    }
    console.log(stdout || '✅ Rebuild thành công');
  });
}

// Main
export async function manageCache() {
  console.log('🚀 Bắt đầu quản lý cache...');
  await scheduleResultReset();
  scheduleFoldersRebuild();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  manageCache();
}
