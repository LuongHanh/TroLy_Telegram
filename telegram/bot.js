// telegram/bot.js
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import path from 'path';
import 'dotenv/config';

import { handleUserInput } from '../logic/intentRouter.js';
import { readJSON } from '../services/fileService.js';
import { escapeMarkdown } from '../utils/escapeMarkdown.js';

const bot = new Telegraf(process.env.BOT_TOKEN);
let isInited = false; // tránh đăng ký nhiều lần
let viewProgress = 0; // chỉ có 1 user nên dùng biến global
const CACHE_DIR    = './cache';
const RESULT_FILE  = path.join(CACHE_DIR, 'result.json');
let isSendingResults = false;

/* ======================== Helpers ======================== */
function formatTaskList(title, tasks) {
  const icons = {
    'Cần chú ý': '🚨',
    'Cần làm ngay': '🔴',
    'Quan trọng': '🟠',
    'Khá quan trọng': '🟢',
    'Ít quan trọng': '⚪'
  };

  return [
    `_ __${title}__ _`,
    ...tasks.map((t, i) => {
      const prioIcon = icons[t.PriorityLabel] || '⚪';
      const deadline = t.DeadlineFormatted
        ? `🗓 ${escapeMarkdown(t.DeadlineFormatted)}`
        : '⏳ Không có';
      return (`${i + 1} ${escapeMarkdown('. ')} ${prioIcon} *${escapeMarkdown(t.Title)}*\n   ${deadline} ${escapeMarkdown(' --- ')} *${escapeMarkdown(t.PriorityLabel)}*`);
    })
  ].join('\n\n');
}

async function sendFileResults(ctx) {
  if (isSendingResults) return; // chống double
  isSendingResults = true;
  let files = [];
  try {
    files = await readJSON(RESULT_FILE);
  } catch {
    isSendingResults = false;
    return ctx.reply('⚠️ Không đọc được dữ liệu từ result.json');
  }

  if (!Array.isArray(files) || !files.length) {
    isSendingResults = false;
    return ctx.reply('⚠️ Không tìm thấy file nào.');
  }

  const start = viewProgress;
  const end = start + 8;
  const keyboard = [];

  if (start >= files.length) {
    isSendingResults = false;
    return ctx.reply('📌 Hết rồi!');
  }

  for (const f of files.slice(start, end)) {
    if (f.type === 'folder' || !f.id) continue;
    keyboard.push([
      { text: `${f.name}`, url: `https://drive.google.com/file/d/${f.id}/view?usp=sharing` }
    ]);
  }

  viewProgress = end; // cập nhật tiến độ

  if (end < files.length) {
    keyboard.push([{ text: '▶️ Xem thêm', callback_data: 'more' }]);
  }

  await ctx.reply('📂 Kết quả tìm kiếm:', {
    reply_markup: { inline_keyboard: keyboard },
    disable_web_page_preview: true
  });
  isSendingResults = false;
}

export function launchBot() {
  if (isInited) return;
  isInited = true;

  // ==== Command: /start ====
  bot.start((ctx) => {
    ctx.reply('👋 Chào mừng đến với Trợ lý cá nhân!\nHãy nhập yêu cầu hoặc dùng /help để xem hướng dẫn.');
  });

  // ==== Command: /help ====
  bot.help((ctx) => {
    ctx.reply(`📖 Hướng dẫn:
    /ping - kiểm tra bot hoạt động
    /w - Lấy link web
    /today - lấy lịch hôm nay
    /getd <dd-mm-yyyy> - lấy lịch ngày bất kỳ
    /getw <dd-mm-yyyy> - lấy lịch tuần bất kỳ
    /getn <n> - lấy lịch n ngày gần nhất
    /add <title-deadline-description> - thêm lịch
    /getu <title-deadline> - chọn lịch cập nhật
    /update <title-deadline-description> - cập nhật
    /findk <từ khóa> - tìm file theo từ khoá <báo cáo>
    /findt <time> - tìm file theo khoảng thời gian <mới nhất>
    /findd <description> - tìm file theo mô tả
    /findp <name> - tìm file theo thư mục cha
    /finde <type> - tìm file theo loại file
`);
  });

  // ==== List các lệnh slash ====
  const cmdList = [
    'ping', 'w',
    'today', 'getd', 'getw', 'getn',
    'add', 'getu', 'update',
    'findk', 'findt', 'findd', 'findp', 'finde'
  ];
  const cmdRegex = new RegExp(`\\/(${cmdList.join('|')})(?:\\s+([^/]+))?`, 'gi');

  // ==== Listener chính ====
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    let matches;
    let commandsFound = [];
    try {
      while ((matches = cmdRegex.exec(text)) !== null) {
        const command = matches[1];
        const argsText = matches[2]?.trim() || '';
        commandsFound.push({ command, argsText });
      }
      
      if (commandsFound.length === 0) { // Không phải slash command → gửi sang AI
        const reply = await handleUserInput(text, {
          chatId: ctx.chat.id,
          userId: ctx.from.id
        });
        if (!reply) return ctx.reply('🤖 Chưa phát triển thuần NLP');
      }

      for (let i = 0; i < commandsFound.length; i++) {
        const { command, argsText } = commandsFound[i];
        const findFile = command.toLowerCase().includes('find') || null; //lọc chức năng tìm file
        try {
          const reply = await handleUserInput(
            `/${command} ${argsText}`.trim(), //truyền nguyên văn từng slash cho AI
            {
              chatId: ctx.chat.id,
              userId: ctx.from.id,
              intent: command,
              args: { raw: argsText },
              findFile
            }
          );

          if (findFile) {   //dùng cho file
            if (Array.isArray(reply)) {
              viewProgress = 0; 
              await sendFileResults(ctx);
              return;
            }
          }
          else {              
            if(reply[0] === 0){
              const webLink = process.env.WEB_LINK; // lấy link từ .env
              await ctx.reply(`Link web: ${webLink}`, {
                reply_markup: {
                  inline_keyboard: [ { text: "🔗 Mở web", url: webLink } ]
                },
                disable_web_page_preview: true
              });
              isSendingResults = false;
            }
            else if(reply[0] === 1){
              ctx.reply(escapeMarkdown(reply[1]), { parse_mode: 'MarkdownV2' });
            }
            else {
              ctx.reply(formatTaskList(reply[1], reply[2]), { parse_mode: 'MarkdownV2' }); // dùng cho tasks
            }
            return;
          }
        } catch (err) {
          console.error(`Lỗi khi xử lý /${command}:`, err);
        }
      }
      return ctx.reply('Vui lòng nhập lại!');
    } catch (err) {
      console.error('Lỗi bot.on text handler:', err);
      ctx.reply('⚠️ Có lỗi khi xử lý yêu cầu. Thử lại sau.');
    }
  });

  bot.on('callback_query', async (ctx) => {
    if (ctx.callbackQuery.data === 'more') {
      await sendFileResults(ctx);
      await ctx.answerCbQuery();
    }
  });

  // ==== Chạy bot ====
  bot.launch({ dropPendingUpdates: true });
  console.log('🚀 Telegram Bot đã sẵn sàng');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
export default bot;