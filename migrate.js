// データベースの構造を途中から変更したいとき（マイグレーション）に使用

const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'data', 'terms.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    );
`);

db.close();
