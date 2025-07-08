const express = require('express');
const router = express.Router();
const db = require('../db'); // DBモジュールの読み込み
const { generateQuestion } = require('../services/geminiService'); // 問題生成関数の読み込み

// 登録されているすべての語句を取得して、クライアント側に送信
router.get('/', (req, res) => {
  const stmt = db.prepare('SELECT id, word, tag, proficiency FROM terms ORDER BY id DESC');
  const rows = stmt.all();
  res.json(rows);
});

// ユーザーがすでに登録したタグの一覧を取得（重複排除）し、クライアント側に送信
router.get('/tags', (req, res) => {
  const stmt = db.prepare(`SELECT DISTINCT tag FROM terms WHERE tag IS NOT NULL AND tag != ''`);
  const rows = stmt.all();
  const tags = rows.map(row => row.tag);
  res.json(tags);
});

// 語句を登録
router.post('/', (req, res) => {
  // クライアント側からword,tagの情報を取得
  const { word, tag } = req.body;
  if (!word) return res.status(400).json({ error: 'word is required' });

  // 初期値設定
  const tagToInsert = (tag || '').trim() || '未分類';
  const initialProficiency = 30;

  try {
    const stmt = db.prepare('INSERT INTO terms (word, tag, proficiency) VALUES (?, ?, ?)');
    const info = stmt.run(word, tagToInsert, initialProficiency);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error('DB挿入エラー:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// 語句を削除
router.delete('/:id', (req, res) => {
  // クライアント側からidの情報を取得
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM terms WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: '指定された語句が存在しません' });
  }

  res.status(200).json({ success: true });
});

// タグ更新
router.patch('/:id', (req, res) => {
  // クライアント側からid,tagの情報を取得
  const { id } = req.params;
  const { tag } = req.body;

  try {
    const stmt = db.prepare('UPDATE terms SET tag = ? WHERE id = ?');
    const result = stmt.run(tag || '未分類', id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '更新対象が存在しません' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('タグ更新エラー:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// AIによる問題生成
router.post('/generate-question', async (req, res) => {
  // クライアント側からwordの情報を取得
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'word is required' });

  // 生成できれば結果をクライアント側に送信
  try {
    const result = await generateQuestion(word);
    res.json({
      question: result.question,
      explanation: result.explanation
    });
  } catch (error) {
    console.error('[生成エラー]', error);
    res.status(500).json({ error: '問題の生成に失敗しました' });
  }
});

// 習熟度更新
router.patch('/:id/proficiency', (req, res) => {
  // クライアント側からid,deltaの情報を取得
  const { id } = req.params;
  const { delta } = req.body;

  if (typeof delta !== 'number') {
    return res.status(400).json({ error: 'delta must be a number' });
  }

  // 現在の習熟度を取得
  const current = db.prepare('SELECT proficiency FROM terms WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: '語句が存在しません' });

  // 新しい習熟度を算出（0〜100にクリップ）
  const newProficiency = Math.max(0, Math.min(100, current.proficiency + delta));

  // 更新を実行
  db.prepare('UPDATE terms SET proficiency = ? WHERE id = ?').run(newProficiency, id);
  res.json({ success: true });
});

// routerオブジェクトを外部ファイルで使えるようにするんご
module.exports = router;

