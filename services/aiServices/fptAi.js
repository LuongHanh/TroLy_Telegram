// services/aiServices/fptAi.js
import fetch from 'node-fetch';
import 'dotenv/config';

const BOT_TOKEN = process.env.FPT_BOT_TOKEN; // Token Bot trong phần Cài đặt
const BOT_CODE = process.env.FPT_BOT_CODE;   // Mã Bot trong phần Cài đặt
const API_URL = `https://api.fpt.ai/hmi/chat/${BOT_CODE}`;

if (!BOT_TOKEN || !BOT_CODE) {
  throw new Error('Thiếu FPT_BOT_TOKEN hoặc FPT_BOT_CODE trong file .env');
}

/**
 * Gửi tin nhắn đến FPT.AI Chatbot và nhận phản hồi
 * @param {string} text - Tin nhắn người dùng
 * @param {string} userId - ID duy nhất của người dùng
 * @returns {Promise<object>} - JSON phản hồi từ chatbot
 */
export async function analyzeMessage(text, userId = 'default_user') {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: { type: 'text', content: text },
      userId
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`FPT.AI Chatbot lỗi ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Lấy intent từ phản hồi Chatbot
 * @param {string} text
 * @returns {Promise<string|null>}
 */
export async function getIntent(text) {
  const result = await analyzeText(text);

  // Intent có thể nằm trong `result.data[0].intent`
  const intent = result?.data?.[0]?.intent || null;
  return intent;
}

/**
 * Lấy entities từ phản hồi Chatbot
 * @param {string} text
 * @returns {Promise<object>}
 */
export async function getEntities(text) {
  const result = await analyzeText(text);

  // Entities có thể nằm trong `result.data[0].entities`
  const entities = result?.data?.[0]?.entities || {};
  return entities;
}
