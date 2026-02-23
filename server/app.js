// サーバー全体の設定と起動

// APIキーの管理
require('dotenv').config();

// 必要なライブラリをインポート
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const termsRouter = require('./routes/terms');
const promptsRoutes = require('./routes/prompts');
const statsRoutes = require('./routes/stats');
const path = require('path');

dotenv.config();                  // .env（APIキー管理）を読み込む
const app = express();            // Expressアプリを初期化
const PORT = 3000;                // 使用するポート番号

app.use(cors());                  // フロントからの通信を許可
app.use(express.json());          // JSON形式のリクエストを扱えるようにする

app.use('/terms', termsRouter);   // "/terms"でAPIが動くように設定
app.use('/prompts', promptsRoutes);  // "/prompts"でAPIが動くように設定
app.use('/stats', statsRoutes);      // "/stats"でAPIが動くように設定

app.use(express.static(path.join(__dirname, '../client')));  // clientフォルダを静的ファイルとして配信

app.listen(PORT, () => {          // サーバーをポート3000で起動する
  console.log(`Server running on http://localhost:${PORT}`);
});

