// tools/cacheManager.js
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

const CACHE_DIR = './cache';
const RESULT_FILE = path.join(CACHE_DIR, 'result.json');
const FOLDERS_FILE = path.join(CACHE_DIR, 'folders.json');

const TTL_RESULT_HOURS = 6;

let countdownState = {
  result: { lastModified: Date.now(), ttl: TTL_RESULT_HOURS * 3600 * 1000, label: '🗂 Result', file: RESULT_FILE },
};

// Ghi dữ liệu rỗng {}
async function clearFile(filePath) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, '{}', 'utf-8');
    console.log(`🗑 Đã reset dữ liệu trong ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`❌ Lỗi khi reset file ${filePath}:`, err);
  }
}

// Lấy mtime
async function getFileMTime(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    return Date.now();
  }
}

// Định dạng HH:MM:SS
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Update countdown
async function updateCountdown(key) {
  const item = countdownState[key];
  const now = Date.now();
  const elapsed = now - item.lastModified;
  const remaining = item.ttl - elapsed;

  if (remaining <= 0) {
    await clearFile(item.file);
    item.lastModified = Date.now();
    return formatCountdown(item.ttl);
  }
  return formatCountdown(remaining);
}

// In tất cả countdown trên nhiều dòng
async function renderCountdowns() {
  const resTime = await updateCountdown('result');
  console.clear();
  console.log(`${countdownState.result.label} (${path.basename(countdownState.result.file)}) còn lại: ${resTime}`);
}

// Lấy mtime ban đầu
async function initCountdowns() {
  countdownState.result.lastModified = await getFileMTime(RESULT_FILE);
}

// Rebuild folders.json lúc 03:00
function scheduleFoldersRebuild() {
  const now = new Date();
  let next3AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 3, 0, 0);
  if (now >= next3AM) {
    next3AM.setDate(next3AM.getDate() + 1);
  }
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
  console.clear();
  console.log('🚀 Bắt đầu quản lý cache...');
  await initCountdowns();
  setInterval(renderCountdowns, 1000);
  scheduleFoldersRebuild();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  manageCache();
}
