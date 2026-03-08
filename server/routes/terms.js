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
  const { word, apiKey, model } = req.body;
  if (!word) return res.status(400).json({ error: '単語がありません' });
  if (!apiKey) return res.status(400).json({ error: "Gemini APIキーがありません" });

  console.log(`\n🧠 問題生成: word="${word}" apiKeyPresent=${!!apiKey}`);

  // 生成できれば結果をクライアント側に送信
  try {
    const result = await generateQuestion(word, apiKey, model);
    res.json(result);
  } catch (error) {
    console.error('[生成エラー]', error);
    const is429 = error.status === 429 || (error.message && error.message.includes('429'));
    const isQuota = error.message && (error.message.includes('quota') || error.message.includes('Quota'));
    if (is429 || isQuota) {
      return res.status(503).json({
        error: 'APIの利用制限に達しました。しばらく待ってから再試行してください。（無料枠は1日あたりのリクエスト数に上限があります）',
        code: 'RATE_LIMIT'
      });
    }
    res.status(500).json({ error: '問題の生成に失敗しました' });
  }
});

// 習熟度更新
router.patch('/:id/proficiency', (req, res) => {
  // クライアント側からid,delta,result,word,tagの情報を取得
  const { id } = req.params;
  const { delta, result, word, tag } = req.body;

  if (typeof delta !== 'number') {
    return res.status(400).json({ error: 'delta must be a number' });
  }

  // 現在の習熟度を取得
  const current = db.prepare('SELECT proficiency, word, tag FROM terms WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: '語句が存在しません' });

  // 新しい習熟度を算出（0〜100にクリップ）
  const newProficiency = Math.max(0, Math.min(100, current.proficiency + delta));

  // 更新を実行
  db.prepare('UPDATE terms SET proficiency = ? WHERE id = ?').run(newProficiency, id);

  // 学習ログを記録
  const logResult = result || (delta > 0 ? 'correct' : 'wrong');
  const logWord = word || current.word;
  const logTag = tag || current.tag || '';
  db.prepare(`
    INSERT INTO study_logs (term_id, word, tag, result, proficiency_before, proficiency_after, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+9 hours'))
  `).run(parseInt(id), logWord, logTag, logResult, current.proficiency, newProficiency);

  res.json({ success: true });
});

// routerオブジェクトを外部ファイルで使えるようにするんご
module.exports = router;

