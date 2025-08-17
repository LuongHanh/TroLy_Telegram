// services/aiServices/openAi.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Thứ tự ưu tiên model
const MODELS = [
  'openai/gpt-3.5-turbo',                 // chính
  'mistralai/mixtral-8x7b-instruct',       // fallback 1
  'meta-llama/llama-3-8b-instruct'         // fallback 2
];

const RULES = `
Bạn là trợ lý AI tiếng Việt. 
Phân tích câu lệnh thành JSON với intent ∈ {add, getu, update, finde}

Quy tắc:
- Giữ nguyên chính tả cho title, description, keyword.
- Nếu thiếu dữ liệu bắt buộc, liệt kê vào "missing".
- Chỉ trả JSON hợp lệ, không giải thích.
Đối với intent = add, getu, update:
- title được phân tích cô đọng, chỉ chứa tiêu đề, không chứa thời gian hay mô tả
- deadline chuyển sang datetime yyyy/mm/dd hh:mm:ss
- description là nguyên văn câu người dùng
- Có intent nhưng không có nội dung vẫn trả về json rỗng với intent đó
- intent = /update trả về id chứa id, còn lại làm như bình thường
- priority: số từ 1 đến 5:
1 = việc ít quan trọng (xem phim, chơi game,… và các công việc tương tự)
2 = việc khá quan trọng (liên hoan, tập thể dục, chi tiêu, sinh hoạt, hoạt động ngoại khoá, và các công việc tương tự)
3 = việc quan trọng (ăn, học, ngủ)
4 = việc rất quan trọng ngắn hạn (thi cử, đóng tiền, và các công việc tương tự)
5 = việc rất quan trọng dài hạn (>=1 năm: nghiên cứu khoa học, nckh, khởi nghiệp, và các công việc tương tự)
Đối với intent = finde:
- intent = /finde , trả về type là 1 trong {ảnh,hình,pdf,word,excel,powerpoint,video,âm thanh,c++,c,java,python,javascript,html,css,json,packet tracer,thư viện,chương trình,disk image,nén}

Định dạng JSON:
{
  "intent": "",
  "arguments": {
    "id": "",
    "title": "",
    "description": "",
    "deadline": "",
    "priority": null,
    "type": "",
  },
  "missing": [],
  "confirm": false
}
`;

async function callModel(model, message, forcedIntent) {
  const userPrompt = forcedIntent
    ? `Intent ép buộc: ${forcedIntent}\nPhân tích tham số cho intent này.\nCâu lệnh: "${message}"`
    : `Câu lệnh: "${message}"`;

  const res = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: RULES },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const content = res.data.choices[0].message.content.trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI trả về không chứa JSON hợp lệ');

  return JSON.parse(jsonMatch[0]);
}

export const analyzeMessage = async (message, forcedIntent = null) => {
  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`🔹 Gọi model: ${model}`);
      return await callModel(model, message, forcedIntent);
    } catch (err) {
      lastError = err;

      // Nếu lỗi 402 hoặc 429 → thử model tiếp theo
      const status = err?.response?.status;
      if (status === 402 || status === 429 || !status) {
        console.warn(`⚠️ Model ${model} lỗi (${status}), thử fallback...`);
        continue;
      } else {
        break; // lỗi khác thì dừng luôn
      }
    }
  }

  console.error('❌ Lỗi AI cuối cùng:', lastError?.response?.data || lastError?.message);
  throw new Error('Tất cả model đều lỗi, không thể phân tích.');
};
