# QuAlify
単語を登録し、Gemini API を活用して自動で問題を生成する学習支援アプリです。

## 使用技術
| 種別      | 技術                      |
| ------- | ----------------------- |
| フロントエンド | HTML / CSS / JavaScript |
| バックエンド  | Node.js / Express       |
| データベース  | SQLite（better-sqlite3）  |
| 外部API   | Google Gemini API       |

## バージョン情報
本プログラムは2024年2月に初期版を作成。

・Ver1.0：制作した初期版を公開 (2025.07.08)

## セットアップ
0. node.jsのインストール
1. `git clone https://github.com/Riarokit/AI_Studying.git`
2. 依存モジュールのインストール
3. VSCode拡張機能のインストール
4. GEMINI_API_KEYの設定
5. サーバー起動 (serverディレクトリ上で) `node app.js`

### 2. 依存モジュールのインストール
`npm install express cors dotenv better-sqlite3 @google/generative-ai marked langchain@0.1.14 @langchain/core langchain zod`

### 3. VSCode拡張機能のインストール
・Live Server By Ritwick Dey  
・SQLite Viewer By Florian Klampfer

### 4. GEMINI_API_KEYの設定
serverディレクトリ直下に.envファイルを作成  
`GEMINI_API_KEY=...`  
...にGEMINI API KEYを入力する

## ディレクトリ構成
```
AI_Studying/
├── client/                  # フロントエンド（HTML, CSS, JS）
│   ├── index.html
│   ├── main.js
│   └── style.css
├── server/                  # バックエンド（Node.js + Express）
│   ├── data/                # SQLite DB格納
│   ├── routes/              # APIルート定義
│   ├── services/            # Gemini API
│   ├── app.js               # サーバー起動エントリ
│   ├── db.js                # DB初期化・接続
│   └── .env                 # Gemini APIキー（git管理外）
├── .gitignore
├── migrate.js              # マイグレーション用
├── package.json
└── README.md
```
