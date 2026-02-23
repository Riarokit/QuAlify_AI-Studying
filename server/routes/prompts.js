const express = require('express');
const router = express.Router();
const db = require('../db');

// プロンプト一覧取得
router.get('/', (req, res) => {
  const stmt = db.prepare('SELECT * FROM prompts ORDER BY id');
  const prompts = stmt.all();
  res.json(prompts);
});

// プロンプト新規作成
router.post('/', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'タイトルと内容は必須です' });
  }

  const stmt = db.prepare('INSERT INTO prompts (title, content) VALUES (?, ?)');
  const info = stmt.run(title, content);
  res.status(201).json({ id: info.lastInsertRowid });
});

// プロンプトの更新
router.patch('/:promptId', (req, res) => {
  const { promptId } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'タイトルと内容は必須です' });
  }

  const result = db.prepare('UPDATE prompts SET title = ?, content = ? WHERE id = ?').run(title, content, promptId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'プロンプトが存在しません' });
  }

  res.json({ success: true });
});

// 現在選択されているプロンプトのIDを取得
// settingsテーブルのcurrent_prompt_idキーから取得する
router.get('/selected', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('current_prompt_id');
  const selectedId = row ? parseInt(row.value) : 1; // なければデフォルト(1)
  res.json({ selectedId });
});

// 選択中プロンプトの更新
router.patch('/select/:promptId', (req, res) => {
  const { promptId } = req.params;

  // 該当プロンプトの存在確認
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(promptId);
  if (!prompt) return res.status(404).json({ error: 'プロンプトが存在しません' });

  // settingsテーブルに current_prompt_id を保存（既存あれば置き換え）
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run('current_prompt_id', promptId);

  res.json({ success: true });
});

// プロンプト削除（ただしID=1は削除不可）
router.delete('/:promptId', (req, res) => {
  const { promptId } = req.params;
  if (parseInt(promptId) === 1) {
    return res.status(403).json({ error: 'このプロンプトは削除できません' });
  }

  const result = db.prepare('DELETE FROM prompts WHERE id = ?').run(promptId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'プロンプトが存在しません' });
  }

  res.json({ success: true });
});

// チャット履歴の保存
router.post('/:promptId/chat', (req, res) => {
  const { promptId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  db.prepare('INSERT INTO prompt_chat_logs (prompt_id, message) VALUES (?, ?)').run(promptId, message);
  res.json({ success: true });
});

// チャットのタイトルを取得
router.get('/:promptId/title', (req, res) => {
  const { promptId } = req.params;
  const title = db.prepare('SELECT title FROM prompts WHERE id = ?').get(promptId);
  res.json(title);
});

// チャット履歴の取得
router.get('/:promptId/chat', (req, res) => {
  const { promptId } = req.params;
  const logs = db.prepare('SELECT id, message FROM prompt_chat_logs WHERE prompt_id = ? ORDER BY created_at').all(promptId);
  res.json(logs);
});

// チャットを削除する関数
router.delete('/:promptId/chat/:chatId', (req, res) => {
  const { promptId, chatId } = req.params;
  const result = db.prepare('DELETE from prompt_chat_logs WHERE id = ? AND prompt_id = ?').run(chatId, promptId)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'チャットが存在しません' });
  }
  res.json({ success: true })
})

module.exports = router;
