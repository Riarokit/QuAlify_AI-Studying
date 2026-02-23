const express = require('express');
const router = express.Router();
const db = require('../db');

// 概要（総語句数・総学習回数・直近7日正解率）
router.get('/overview', (req, res) => {
    const totalTerms = db.prepare('SELECT COUNT(*) AS count FROM terms').get().count;
    const totalStudied = db.prepare('SELECT COUNT(*) AS count FROM study_logs').get().count;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const since = sevenDaysAgo.toISOString().slice(0, 10);

    const recentRows = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) AS correct
    FROM study_logs
    WHERE date(created_at) >= ?
  `).get(since);

    const recentAccuracy = recentRows.total > 0
        ? Math.round((recentRows.correct / recentRows.total) * 100)
        : null;

    res.json({ totalTerms, totalStudied, recentAccuracy });
});

// 過去14日の日別 出題数・正解数
router.get('/daily', (req, res) => {
    const rows = db.prepare(`
    SELECT date(created_at) AS day,
           COUNT(*) AS total,
           SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) AS correct
    FROM study_logs
    WHERE date(created_at) >= date('now', '-13 days')
    GROUP BY day
    ORDER BY day ASC
  `).all();
    res.json(rows);
});

// タグ別の平均習熟度
router.get('/tags', (req, res) => {
    const rows = db.prepare(`
    SELECT tag,
           ROUND(AVG(proficiency), 1) AS avg_proficiency,
           COUNT(*) AS count
    FROM terms
    WHERE tag IS NOT NULL AND tag != ''
    GROUP BY tag
    ORDER BY avg_proficiency ASC
  `).all();
    res.json(rows);
});

// 習熟度分布（語句数）
router.get('/proficiency-dist', (req, res) => {
    const low = db.prepare("SELECT COUNT(*) AS count FROM terms WHERE proficiency < 40").get().count;
    const mid = db.prepare("SELECT COUNT(*) AS count FROM terms WHERE proficiency >= 40 AND proficiency < 70").get().count;
    const high = db.prepare("SELECT COUNT(*) AS count FROM terms WHERE proficiency >= 70").get().count;
    res.json({ low, mid, high });
});

// 学習ログを記録
router.post('/log', (req, res) => {
    const { termId, word, tag, result, proficiencyBefore, proficiencyAfter } = req.body;
    if (!termId || !word || !result) {
        return res.status(400).json({ error: 'termId, word, result は必須です' });
    }
    db.prepare(`
    INSERT INTO study_logs (term_id, word, tag, result, proficiency_before, proficiency_after)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(termId, word, tag || '', result, proficiencyBefore ?? null, proficiencyAfter ?? null);
    res.status(201).json({ success: true });
});

module.exports = router;
