// services/aiServices/aiManager.js
import { analyzeMessage as analyzeFPT } from './fptAi.js';
import { analyzeMessage as analyzeOpenAi } from './openAi.js';

/**
 * Chuẩn hóa dữ liệu từ AI về định dạng chuẩn duy nhất
 * @param {object} raw - Kết quả thô từ AI
 * @param {string|null} source - 'fptai' | 'openai' | null
 * @param {string|null} error - Thông báo lỗi nếu có
 * @returns {object} Object chuẩn
 */
function normalizeResult(raw, source, error = null) {
  return {
    intent: raw?.intent || null,
    arguments: {
      // add_task
      title: raw?.arguments?.title || "",
      description: raw?.arguments?.description || "",
      deadline: raw?.arguments?.deadline || "",
      priority: typeof raw?.arguments?.priority === 'number'
        ? raw.arguments.priority
        : null,

      // search_file
      keyword: raw?.arguments?.keyword || "",
      type: raw?.arguments?.type || "",
      searchTime: raw?.arguments?.searchTime || "",
      id: raw?.arguments?.id || null
    },
    missing: Array.isArray(raw?.missing) ? raw.missing : [],
    confirm: Boolean(raw?.confirm),
    source,
    error
  };
}

/**
 * Phân tích câu lệnh người dùng:
 * - Ưu tiên FPT.AI
 * - Nếu lỗi thì fallback sang OpenAI
 * - Nếu cả 2 lỗi thì trả thông báo lỗi
 */
export async function analyzeUserMessage(message) {
  let firstError = null;

  /*// 1️⃣ Thử FPT.AI
  try {
    const result = await analyzeFPT(message);
    return normalizeResult(result, 'fptai', null);
  } catch (err) {
    firstError = `FPT.AI lỗi: ${err.message || err}`;
    console.warn(firstError);
  }*/

  // 2️⃣ Fallback sang OpenAI
  try {
    const result = await analyzeOpenAi(message);
    return normalizeResult(result, 'openai', firstError);
  } catch (err) {
    const secondError = `OpenAI lỗi: ${err.message || err}`;
    console.error(secondError);

    // 3️⃣ Cả hai đều lỗi → trả object chuẩn rỗng + thông báo lỗi
    return normalizeResult(
      {
        intent: null,
        arguments: {},
        missing: [],
        confirm: false
      },
      null,
      `${firstError} | ${secondError}`
    );
  }
}
