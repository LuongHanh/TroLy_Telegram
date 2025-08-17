// logic/intentRouter.js
import * as fileService from '../services/fileService.js';
import * as scheduleController from '../controllers/scheduleController.js';
import * as sessions from '../sessions/SessionManager.js';
import { analyzeUserMessage } from '../services/aiServices/aiManager.js'; // AI parser
import { normalizeDate } from '../utils/normalizeDate.js';

export async function handleUserInput( text, { chatId, userId = chatId, intent, args, findFile } = {}) {
  try {
    let finalIntent = intent.toLowerCase() || null; 
    let finalArgs = { ...args };
    let agr = null; //Tham số cho find*

    if(intent === 'add' || intent === 'update' || intent === 'getu'){ //Chỉ dùng AI cho 3 trường hợp này
      const aiRes = await analyzeUserMessage(text);
      if (!aiRes || !aiRes.intent) {
        return [1,'🤖 Không hiểu yêu cầu của bạn.'];
      }
      finalIntent = aiRes.intent?.replace(/^\//, '') || null;
      finalArgs = aiRes.arguments || {};
    }
    if(findFile){
      agr = finalArgs.raw
    }

   switch (finalIntent) {
    case 'ping':
      return [1,'🏓 Pong!'];
    case 'w':
      return [0];
    // ====================== QUẢN LÝ TASKS ======================
    case 'today': {
      const tasks = await scheduleController.getTodaySchedule();
      if (!tasks.length) return [1, '📅 Hôm nay không có công việc nào'];
      return [2, '📅 Công việc hôm nay:', tasks];
    }

    case 'getd': {
      let day = normalizeDate(finalArgs.raw)
      if (!day) return [1,'⚠️ Cần ngày hợp lệ'];
      const tasks = await scheduleController.getTasksByDate(day);
      if (!tasks.length) return [1,`📅 Không có công việc vào ngày ${day}`];
      return [2,`📅 Công việc ngày ${day}:`, tasks];
    }
    
    case 'getw': {
      let week = normalizeDate(finalArgs.raw)
      if (!week) return [1,'⚠️ Cần tuần hợp lệ'];
      const tasks = await scheduleController.getTasksByDateInWeek(week);
      if (!tasks.length) return [1,`📅 Không có công việc trong tuần ${week}`];
      return [2,`📅 Công việc tuần ${week}:`, tasks];
    }

    case 'getn': {
      let n = parseInt(finalArgs.raw, 10)
      if (Number.isNaN(n)) return [1,'⚠️ Cần số ngày hợp lệ'];
      const tasks = await scheduleController.getTasksBySomeDay(parseInt(n, 10));
      if (!tasks.length) return [1,`📅 Không có công việc trong ${n} gần nhất`];
      return [2,`📅 Công việc ${n} ngày gần nhất:`, tasks];
    }

    case 'add': {
      if (!(finalArgs.title?.trim()) && !(finalArgs.deadline?.trim())) {
        return [1,'⚠️ Vui lòng nhập lại đủ thông tin!'];
      }
      const task = await scheduleController.addTask({
        title: finalArgs.title,
        description: finalArgs.description,
        deadline: finalArgs.deadline,
        priority: finalArgs.priority || 3 //không nói gì thì là quan trọng
      });
      return [1, `✅ Đã thêm công việc: ${task.Title} - ${task.DeadlineFormatted || ''} | Ưu tiên: ${task.Priority}`];
    }

    case 'getu': {
      if (!(finalArgs.title?.trim()) && !(finalArgs.deadline?.trim())) {
        return [1,'⚠️ Cần tiêu đề hoặc ngày để tìm công việc cần cập nhật'];
      }
      const tasks = await scheduleController.findTaskToUpdate(finalArgs.title, finalArgs.deadline);
      if (!tasks.length) return [1,'❌ Không tìm thấy công việc phù hợp để cập nhật'];
      const oldSession = await sessions.getSession(userId); //Lấy dữ liệu từ session
      const oldTasks = oldSession?.updateTaskList || [];
      const isDifferent =
        oldTasks.length !== tasks.length ||
        JSON.stringify(oldTasks) !== JSON.stringify(tasks);
      if (isDifferent) {
        await sessions.saveSession(userId, { updateTaskList: tasks });
      }
      return [2,'📝 Chọn số thứ tự để cập nhật:', tasks]; // In danh sách đánh số 1,2,3...
    }
    
    case 'update': {
      if (!finalArgs.id || !finalArgs.title || !finalArgs.deadline) {
        return [1,'⚠️ Cần nhập id và thông tin để cập nhật'];
      }
      let targetId = finalArgs.id;
      if (/^\d+$/.test(targetId)) { // Nếu user chọn số thứ tự thay vì Id
        const session = await sessions.getSession(userId);
        const index = parseInt(targetId, 10) - 1;
        if (!session?.updateTaskList || !session.updateTaskList[index]) {
          return [1,`⚠️ Không tìm thấy công việc số ${targetId} trong danh sách trước đó`];
        }
        targetId = session.updateTaskList[index].Id; // lấy ID thực tế từ session
      }

      const updated = await scheduleController.updateTaskFull(targetId, finalArgs);
      if (updated) {
        await sessions.clearSession(userId); // ✅ Xoá session sau khi cập nhật thành công
        return [1,`✅ Đã cập nhật: ${updated.Title} - ${updated.DeadlineFormatted || ''} | Ưu tiên: ${updated.Priority}`];
      }

      return [1,`❌ Không tìm thấy công việc ID ${targetId}`];
    }
    
    // ====================== TÌM FILE ======================
    case 'findk':
      return await fileService.findByKeyword(agr);
    case 'findt':
      return await fileService.findByTime(agr);
    case 'findd':
      return await fileService.findByDescription(agr);
    case 'findp':
      return await fileService.findByParentName(agr);
    case 'finde':
      return await fileService.findByType(finalArgs.type);
    default:
      return [1,`🤔 Lệnh "${finalIntent}" chưa được hỗ trợ.`];
    }
  } catch (err) {
    console.error('❌ Lỗi handleUserInput:', err);
    return [1,'⚠️ Có lỗi khi xử lý yêu cầu.'];
  }
}