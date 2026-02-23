# QuAlify - プロジェクト仕様書

> **対象読者：** このプロジェクトを初めて触る方、Web開発の基礎知識がある方  
> **最終更新：** 2026-02-23

---

## 1. プロジェクト概要

**QuAlify（クオリファイ）** は、資格試験（情報処理技術者試験など）の学習を支援するためのAI問題生成Webアプリです。

### できること
- 📝 **語句の登録・管理** ── 覚えたい専門用語をアプリに登録する
- 🤖 **AI問題生成** ── 登録した語句をもとに、Gemini AI が問題・解説を自動生成する
- 🥋 **道場モード** ── タグを選択して連続出題形式でまとめて練習できる
- 📊 **習熟度管理** ── 問題の正誤に応じて語句ごとに習熟度（0〜100）を追跡する
- ✍️ **プロンプト編集** ── AI に渡す指示文（プロンプト）を自分でカスタマイズできる

---

## 2. 使用技術

| 役割 | 技術 |
|------|------|
| フロントエンド | HTML / CSS / Vanilla JavaScript |
| バックエンド | Node.js + Express |
| データベース | SQLite（`better-sqlite3`） |
| AI | Google Gemini API（`@google/generative-ai`） |
| Markdown変換 | `marked.js` |
| バリデーション | `zod` |
| フォント | Google Fonts（Inter / Noto Sans JP） |
| アイコン | Font Awesome |
| グラフ | Chart.js |

---

## 3. ディレクトリ構成

```
QuAlify_AI-Studying/
├── client/                    ← ブラウザに表示されるファイル（フロントエンド）
│   ├── index.html             ── 画面の骨格（HTML）
│   ├── main.js                ── ユーザー操作・API通信のロジック（JS）
│   └── style.css              ── デザイン定義（CSS）
│
├── server/                    ← サーバー側のプログラム（バックエンド）
│   ├── app.js                 ── サーバーの起動・設定ファイル
│   ├── db.js                  ── データベースの接続・テーブル初期化
│   ├── .env                   ── 秘密情報（APIキー等）を管理する設定ファイル
│   ├── data/
│   │   └── terms.db           ── SQLiteデータベースの実体ファイル
│   ├── routes/
│   │   ├── terms.js           ── 語句に関するAPIエンドポイント
│   │   └── prompts.js         ── プロンプトに関するAPIエンドポイント
│   └── services/
│       └── geminiService.js   ── Gemini AIとの通信ロジック
│
├── migrate.js                 ← DBスキーマを後から変更するための移行スクリプト
├── package.json               ← プロジェクトの依存ライブラリ一覧
└── SPEC.md                    ← この仕様書
```

---

## 4. データベース構造

データは `server/data/terms.db` に保存されます。テーブルは以下の4つです。

### `terms`（語句テーブル）
| カラム名 | 型 | 説明 |
|---|---|---|
| `id` | INTEGER | 自動採番のID（主キー） |
| `word` | TEXT | 登録した語句（例：「RAID」） |
| `tag` | TEXT | 分類タグ（例：「ストレージ」）。デフォルトは "未分類" |
| `proficiency` | INTEGER | 習熟度（0〜100）。デフォルトは 30 |

### `prompts`（プロンプトテーブル）
| カラム名 | 型 | 説明 |
|---|---|---|
| `id` | INTEGER | 自動採番のID |
| `title` | TEXT | プロンプトの名前 |
| `content` | TEXT | AIに渡す指示文の内容 |

> 初期データとして「応用情報技術者」という名前のプロンプトが自動登録されます。

### `settings`（設定テーブル）
| カラム名 | 型 | 説明 |
|---|---|---|
| `key` | TEXT | 設定名（例：`current_prompt_id`） |
| `value` | TEXT | 設定値 |

> 現在選択中のプロンプトIDをここに保存することで、次回起動時に引き継ぎます。

### `prompt_chat_logs`（プロンプト追加指示ログ）
| カラム名 | 型 | 説明 |
|---|---|---|
| `id` | INTEGER | 自動採番のID |
| `prompt_id` | INTEGER | 対象プロンプトのID |
| `message` | TEXT | 追加指示のメッセージ |
| `created_at` | DATETIME | 作成日時 |

---

## 5. APIエンドポイント一覧

サーバーは `http://localhost:3000` で動作します。

### 語句 API（`/terms`）

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/terms` | 全語句の一覧を取得 |
| `GET` | `/terms/tags` | 登録済みタグの一覧を取得（重複なし） |
| `POST` | `/terms` | 語句を新規登録 |
| `DELETE` | `/terms/:id` | 指定IDの語句を削除 |
| `PATCH` | `/terms/:id` | 指定IDの語句のタグを更新 |
| `POST` | `/terms/generate-question` | 語句をもとにAIで問題を生成 |
| `PATCH` | `/terms/:id/proficiency` | 習熟度を増減（deltaを指定） |

### プロンプト API（`/prompts`）

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/prompts` | プロンプト一覧を取得 |
| `POST` | `/prompts` | プロンプトを新規作成 |
| `PATCH` | `/prompts/:promptId` | プロンプトを更新 |
| `DELETE` | `/prompts/:promptId` | プロンプトを削除（ID=1は削除不可） |
| `GET` | `/prompts/selected` | 現在選択中のプロンプトIDを取得 |
| `PATCH` | `/prompts/select/:promptId` | 選択するプロンプトを切り替え |

---

## 6. 実行フロー（処理の流れ）

### 6-1. サーバーの起動

```
node app.js（server/ディレクトリ内で実行）
  │
  ├─ dotenv で .env 読み込み（APIキー等）
  ├─ Express アプリ起動（ポート3000）
  ├─ db.js が自動実行 → SQLiteに接続・テーブル作成
  └─ /terms, /prompts ルート登録
      client/ フォルダを静的ファイルとして配信
```

### 6-2. 画面の初期表示

```
ブラウザでアクセス（http://localhost:3000）
  │
  ├─ index.html 読み込み
  ├─ main.js 読み込み
  │   ├─ LocalStorage から APIキー・モデル名を読み込む
  │   ├─ 語句一覧を GET /terms から取得して表示
  │   ├─ タグ一覧を GET /terms/tags から取得
  │   └─ プロンプト一覧を GET /prompts から取得
  └─ 前回のタブを LocalStorage から復元して表示
```

### 6-3. 語句の登録

```
ユーザーが語句・タグを入力して「登録」ボタン押下
  │
  ├─ POST /terms にリクエスト（word, tag を送信）
  ├─ サーバーが terms テーブルに INSERT
  └─ 成功後、フロントが GET /terms を再実行して一覧を更新
```

### 6-4. AI問題の生成（単語管理タブ）

```
語句の「紙飛行機アイコン」ボタン押下
  │
  ├─ LocalStorage から APIキーを取得
  ├─ POST /terms/generate-question にリクエスト（word, apiKey, model を送信）
  │
  ├─ [サーバー側] geminiService.js が実行
  │   ├─ DBから現在選択中のプロンプト内容を取得
  │   ├─ Gemini API にリクエスト（プロンプト + 語句 + JSON出力指示）
  │   ├─ 返却されたJSONを zod でバリデーション
  │   ├─ ※429エラー（制限超過）時は10秒後に1回リトライ
  │   └─ { question, options, explanation } を返す
  │
  └─ フロントに問題が表示される（Markdown→HTML変換済み）
      └─ 解説ボタン → 正誤ボタン（○/△/✕）で習熟度を更新
```

### 6-5. 道場モード

```
タブ「道場」を選択
  │
  ├─ タグのチェックボックスで対象を選択
  ├─ 「出題開始」ボタン押下
  │
  ├─ GET /terms で全語句を取得
  ├─ 選択タグで絞り込み → シャッフル → 最大出題数でスライス
  │
  └─ 1問ずつ以下を繰り返す
      ├─ fetchQuestionForWord(語句) で問題を取得
      ├─ 問題表示 → 「解説を見る」ボタン押下
      ├─ 解説表示 → 「○ 正解 / ✕ 不正解」ボタン押下
      │   └─ PATCH /terms/:id/proficiency で習熟度を更新
      └─ 次の語句へ（全問終了で結果サマリー表示）
```

### 6-6. プロンプトのカスタマイズ

```
タブ「プロンプト編集」を選択
  │
  ├─ 新規作成 → POST /prompts（title, content を送信）
  ├─ 編集 → PATCH /prompts/:id
  ├─ 削除 → DELETE /prompts/:id（ID=1は削除不可）
  └─ プロンプトカードをクリック → PATCH /prompts/select/:id
      └─ settings テーブルの current_prompt_id が更新される
          次の問題生成からこのプロンプトが使われる
```

---

## 7. クライアント側のデータ管理（LocalStorage）

APIキーと使用モデルはブラウザの `localStorage` に保存されます（サーバーには保存されません）。

| キー名 | 内容 |
|---|---|
| `gemini_api_key` | Gemini API キー |
| `GEMINI_MODEL` | 使用するGeminiモデル名（例: `gemini-2.5-flash-lite`） |
| `currentTab` | 最後に開いていたタブ名 |

---

## 8. 画面構成（4タブ）

```
┌─────────────────────────────────────────┐
│  ☰  QuAlify                             │ ← ヘッダー
├──────┬──────────────────────────────────┤
│      │                                  │
│ 📚  │  選択中タブのコンテンツ           │
│ 単語 │                                  │
│      │                                  │
│ 🥋  │                                  │
│ 道場 │                                  │
│      │                                  │
│ ✏️  │                                  │
│ PRM │                                  │
│      │                                  │
│ ⚙️  │                                  │
│ 設定 │                                  │
└──────┴──────────────────────────────────┘
```

| タブ名 | 主な機能 |
|---|---|
| **単語の管理** | 語句の登録・削除・タグ編集・習熟度の確認・問題の生成 |
| **道場** | タグ選択 → AI問題を連続出題 → 結果表示（正解率） |
| **プロンプト編集** | AI への指示文を作成・切り替え・編集・削除 |
| **各種設定** | Gemini API キーの登録・削除、使用モデルの切り替え |

---

## 9. セットアップ手順

```bash
# 1. リポジトリのルートで依存ライブラリをインストール
npm install

# 2. .env ファイルを作成（serverフォルダ内）
# ※ 現在 APIキーはブラウザの設定画面で登録するため、.env は任意

# 3. サーバーを起動（serverフォルダ内で実行）
cd server
node app.js

# 4. ブラウザでアクセス
# http://localhost:3000
```

---

## 10. 習熟度の仕様

| 操作 | 変化量 |
|---|---|
| ○（正解） | +20 |
| △（なんとなく正解） | +10 |
| ✕（不正解） | −10 |

- 初期値: **30**
- 最小: **0**、最大: **100**（それ以上/以下にはならない）
- 表示色: 0〜39 → 赤、40〜69 → 黄、70〜100 → 緑

---

## 11. エラーハンドリング

| エラー | 対処 |
|---|---|
| Gemini API 429（レート制限） | 10秒待機して1回リトライ。それでも失敗したら503を返す |
| Gemini API 応答がJSON形式でない | `zod` でバリデーション失敗として500エラー |
| 語句が重複して登録 | DBの `UNIQUE` 制約でエラー → 500エラーを返す |
| プロンプトID=1の削除 | 403エラーで削除を拒否（デフォルトプロンプトを守る） |

---

## 12. ファイル別役割まとめ

| ファイル | 役割 |
|---|---|
| `client/index.html` | 画面の構造定義（タブ・入力フォーム・表示エリア） |
| `client/main.js` | ユーザー操作の処理・サーバーとのAPI通信 |
| `client/style.css` | 全体のデザイン・スタイル |
| `server/app.js` | Expressサーバーの起動・ルーティング設定 |
| `server/db.js` | SQLite接続・テーブル作成・初期データ投入 |
| `server/routes/terms.js` | 語句・問題生成に関するAPIルート |
| `server/routes/prompts.js` | プロンプト管理に関するAPIルート |
| `server/services/geminiService.js` | Gemini APIの呼び出しロジック |
| `migrate.js` | DBスキーマ変更用のマイグレーションスクリプト |
