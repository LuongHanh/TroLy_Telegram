// tools/buildFolderCache.js
import { getDriveClient } from '../config/googleDrive.js';
import fs from 'fs';
import chalk from 'chalk';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function listChildItems(drive, parentId) {
  const items = [];
  let pageToken = undefined;
  const q = `'${parentId}' in parents and trashed = false`; // lấy cả folder và file
  try {
    do {
      const res = await drive.files.list({
        q,
        fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime)',
        pageSize: 1000,
        pageToken,
      });
      if (res.data.files?.length) {
        items.push(...res.data.files);
      }
      pageToken = res.data.nextPageToken;
      if (pageToken) await delay(50);
    } while (pageToken);
  } catch (err) {
    throw err;
  }
  return items;
}

export const updateFolderCache = async () => {
  const drive = await getDriveClient();
  const rootId = process.env.DRIVE_FOLDER_ID;

  console.log('🔁 Bắt đầu cập nhật cache thư mục & file...');
  const startTs = Date.now();

  let rootName = 'root';
  try {
    const meta = await drive.files.get({ fileId: rootId, fields: 'id, name' });
    if (meta?.data?.name) rootName = meta.data.name;
  } catch {
    console.log(chalk.yellow(`⚠️ Không lấy được tên root (${rootId}), dùng 'root' làm mặc định.`));
  }

  const byId = {};
  const queue = [{ id: rootId, path: rootName }];
  let processed = 0;
  let iterations = 0;

  while (queue.length > 0) {
    const node = queue.shift();
    const parentId = node.id;
    const parentPath = node.path || '';

    let attempts = 0;
    let children = null;
    while (attempts < 4) {
      try {
        children = await listChildItems(drive, parentId);
        break;
      } catch (err) {
        attempts++;
        const wait = 200 * attempts;
        console.log(chalk.red(`❌ Lỗi khi liệt kê con của ${parentId} (lần ${attempts}): ${err.message}. Thử lại sau ${wait}ms`));
        await delay(wait);
      }
    }
    if (!children) continue;

    for (const child of children) {
      const name = child.name || '';
      const id = child.id;
      const childPath = parentPath ? `${parentPath}/${name}` : name;
      const isFolder = child.mimeType === 'application/vnd.google-apps.folder';

      byId[id] = {
        name,
        path: childPath,
        mimeType: child.mimeType,
        type: isFolder ? 'folder' : 'file',
        parentId,
        modifiedTime: child.modifiedTime || child.createdTime || null
      };

      if (isFolder) {
        queue.push({ id, path: childPath });
      }

      processed++;
    }

    iterations++;
    if (iterations % 10 === 0) {
      const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
      console.log(`📁 Đã quét ${processed} item (queue ~${queue.length}) — ${elapsed}s`);
      await delay(50);
    }
  }

  const out = { byId, generatedAt: new Date().toISOString() };
  fs.mkdirSync('./cache', { recursive: true });
  fs.writeFileSync('./cache/folders.json', JSON.stringify(out, null, 2), 'utf8');

  const timeSpent = ((Date.now() - startTs) / 1000).toFixed(1);
  console.log(chalk.green(`✅ Hoàn thành: ${processed} mục (file + folder) — Lưu ./cache/folders.json — Mất ${timeSpent}s`));
};
