const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ディレクトリがなければ作成
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// DB接続の供給
const dbPath = path.resolve(__dirname, 'data', 'terms.db');
const db = new Database(dbPath);

// テーブルがなければ作成
db.exec(`

  CREATE TABLE IF NOT EXISTS terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE,
    tag TEXT DEFAULT '',
    proficiency INTEGER DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS prompt_chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id)
  );
`);

// 初期プロンプト挿入
const count = db.prepare('SELECT COUNT(*) AS count FROM prompts').get().count;
if (count === 0) {
  const defaultPrompt = `語句に関連する応用情報技術者試験レベルの問題を1問作ってください。`;

  db.prepare('INSERT INTO prompts (title, content) VALUES (?, ?)').run(
    '応用情報技術者',
    defaultPrompt
  );
}

// 初期プロンプト（ID=1）をcurrent_prompt_idとして登録
const exists = db.prepare('SELECT * FROM settings WHERE key = ?').get('current_prompt_id');
if (!exists) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('current_prompt_id', '1');
}


module.exports = db;
