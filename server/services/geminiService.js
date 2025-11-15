const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');
const { z } = require('zod');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const schema = z.object({
    question: z.string().describe("問題文と選択肢"),
    explanation: z.string().describe("問題に対する解説")
});

async function generateQuestion(word) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  // プロンプト取得
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('current_prompt_id');
  const promptId = setting ? parseInt(setting.value) : 1;
  const promptRow = db.prepare('SELECT content FROM prompts WHERE id = ?').get(promptId);
  let promptTemplate = promptRow?.content || '';

  // チャット指示取得
  const logs = db.prepare('SELECT message FROM prompt_chat_logs WHERE prompt_id = ? ORDER BY created_at').all(promptId);
  const instructionText = logs.length > 0
    ? `以下の追加指示も考慮してください：\n${logs.map(l => `・${l.message}`).join('\n')}`
    : '';

  // JSON形式の出力指示
  const formatInstructions = `以下の形式のJSONで出力してください:
{
  "question": "○○に関する問題文と選択肢をここに記述",
  "explanation": "その解説をここに記述"
}`;

  // プロンプト構築
  const prompt = `
${promptTemplate}

語句：「${word}」

${instructionText}

${formatInstructions}
`;

  // AI呼び出し
  const result = await model.generateContent([prompt]);
  const response = await result.response;
  const text = await response.text();
  console.log('[Geminiの出力]:\n', text);

  // マークダウンの ```json ``` を除去
  const cleanedText = text
    .replace(/^```json\s*/, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '');

  // 構造化パース
  const parsed = schema.safeParse(JSON.parse(cleanedText));
  if (!parsed.success) {
    console.error("構造化パースに失敗:", parsed.error);
    throw new Error("構造化パースに失敗しました");
  }

  return parsed.data;
}

module.exports = { generateQuestion };
