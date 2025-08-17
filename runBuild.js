import chalk from 'chalk';
import { updateFolderCache } from './tools/buildFolderCache.js';

console.log(chalk.blue.bold('🚀 Bắt đầu build folders.json...'));
const startTime = Date.now();

try {
  await updateFolderCache();
  const timeSpent = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(chalk.green.bold(`✅ Hoàn tất build folders.json — Mất ${timeSpent}s`));
} catch (err) {
  console.error(chalk.red.bold('❌ Lỗi khi build folders.json:'), err.message);
  process.exit(1);
}
