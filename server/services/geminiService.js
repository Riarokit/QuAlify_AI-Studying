const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');
const { z } = require('zod');
const { StructuredOutputParser } = require('langchain/output_parsers');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    question: z.string().describe("問題文と選択肢"),
    explanation: z.string().describe("問題に対する解説")
  })
);

async function generateQuestion(word) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  // プロンプトを文字列結合で構築
  const prompt = `
${promptTemplate}

${instructionText}

${parser.getFormatInstructions()}
`.replace('{word}', word);

  // AI呼び出し
  const result = await model.generateContent([prompt]);
  const response = await result.response;
  const text = await response.text();
  console.log('[Geminiの出力]:\n', text);

  // 構造化パース
  const parsed = await parser.parse(text);
  return parsed;
}

module.exports = { generateQuestion };

