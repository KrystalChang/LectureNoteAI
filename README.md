# 📖 LectureNoteAI

**閱讀講義、逐頁摘要與問答的 AI 助理**

LectureNoteAI 是一款 AI 驅動的 PDF 講義閱讀工具，專為學生與學習者設計。上傳 PDF 講義後，系統會自動逐頁產生摘要、支援圈選圖表提問、提供即時問答，並內建逐頁筆記編輯器，最後可將所有內容匯出為 PDF、Word 或 Markdown。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Anthropic](https://img.shields.io/badge/AI-Claude-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ 功能特色

### 🤖 AI 逐頁摘要

- 上傳 PDF 後，自動為每一頁產生 AI 摘要（串流即時顯示）
- 首頁摘要完成後，**背景預先產生所有頁面摘要**，切頁時即刻顯示
- 支援多種摘要格式：條列重點 / 完整說明 / 考試重點整理
- 可自訂語氣（詳細、精簡、教學型）與語言（繁體中文 / English）
- 已產生的摘要會依 prompt hash **智慧快取**，相同設定不重複呼叫 API

### 💬 智慧問答（Q&A）

- 對當前頁面提問，AI 串流回答並**自動保存對話紀錄**
- **文字選取提問**：在 PDF 上選取段落後，選取內容會自動帶入問題上下文
- **圈選圖表提問**：開啟「圈選模式」，框選圖表或公式區域，系統截圖後以 **Vision（圖片辨識）** 方式送出提問
- 純圖片頁面（文字少於 12 字）自動偵測，改以整頁截圖進行摘要

### 📝 逐頁筆記

- 內建 **BlockNote** 區塊式富文本編輯器（類似 Notion）
- 支援標題、清單、粗體、斜體、程式碼等格式
- **自動儲存**（700ms 防抖），即時顯示儲存狀態

### 📂 檔案庫管理

- 我的檔案庫：以卡片式格線瀏覽所有文件與資料夾
- 支援**無限層級巢狀資料夾**（建立、重新命名、刪除）
- 文件操作：重新命名、移動到其他資料夾、刪除
- 拖放或點擊上傳 PDF（最大 50 MB）

### 📤 匯出筆記

- **PDF**：開啟列印頁面，一鍵列印或另存 PDF
- **Word（.docx）**：自動將 Markdown 摘要轉換為 Word 格式下載
- **Markdown（.md）**：純文字格式匯出
- 匯出內容包含每頁的 AI 摘要 + 使用者筆記

### ⚙️ AI 設定與提示詞自訂

- **全域設定**（檔案庫層級）：設定所有新上傳文件的預設偏好
- **文件層級設定**：為個別文件覆蓋設定
- 預設文件類型：投影片 / 論文 / 教科書 / 考卷 / 自訂
- **進階提示詞編輯器**：完整自訂 system prompt 與 user prompt，支援 `{{pageText}}`、`{{selectedText}}`、`{{question}}` 等模板變數
- **AI 建議設定**：上傳後可讓 AI 分析文件前 5 頁，自動推薦最佳設定

### 🎨 主題系統

- 明亮 / 深色 / 跟隨系統 三種模式切換
- 8 種預設主題色 + 自訂 HEX 色碼
- 無閃爍切換（pre-init script 避免首次載入白畫面）

### 🔐 使用者驗證

- Google OAuth 一鍵登入
- JWT Session 管理
- 所有資料（文件、資料夾、筆記）嚴格按使用者隔離

---

## 🛠 技術架構

| 層級 | 技術 |
|------|------|
| **框架** | Next.js 16 (App Router)、React 19、TypeScript 5 |
| **資料庫** | PostgreSQL + Prisma ORM |
| **驗證** | NextAuth v5（Google OAuth + JWT） |
| **AI 引擎** | Anthropic Claude API（支援串流、Vision、Prompt Caching） |
| **檔案儲存** | Cloudflare R2（S3 相容，Presigned URL 直傳） |
| **PDF 渲染** | react-pdf / pdfjs-dist（瀏覽器端） |
| **PDF 文字擷取** | pdfjs-dist legacy build（伺服器端） |
| **筆記編輯器** | BlockNote（區塊式 Notion-like 編輯器） |
| **樣式** | Tailwind CSS v4 |
| **數學公式** | KaTeX |
| **串流協議** | 自訂 NDJSON（`application/x-ndjson`） |

---

## 📁 專案結構

```
LectureNoteAI/
├── prisma/
│   ├── schema.prisma            # 資料模型定義
│   └── migrations/              # 資料庫遷移檔
├── src/
│   ├── auth.ts                  # NextAuth 設定
│   ├── app/
│   │   ├── page.tsx             # 首頁（檔案庫）
│   │   ├── login/               # 登入頁
│   │   ├── documents/[id]/      # 文件閱讀器
│   │   └── api/                 # API 路由
│   │       ├── documents/       #   文件 CRUD、摘要、問答、筆記、匯出
│   │       ├── folders/         #   資料夾 CRUD
│   │       ├── settings/        #   AI 偏好設定
│   │       └── upload/          #   兩步驟上傳（presign + finalize）
│   ├── components/              # React 元件
│   │   ├── pdf_viewer.tsx       #   PDF 檢視器 + 圈選功能
│   │   ├── pageChat.tsx         #   AI 摘要與問答面板
│   │   ├── note_editor.tsx      #   BlockNote 筆記編輯器
│   │   ├── library_browser.tsx  #   檔案庫瀏覽器
│   │   └── ...
│   └── lib/                     # 工具函式庫
│       ├── ai.ts                #   Anthropic SDK 封裝
│       ├── r2.ts                #   R2 / S3 操作
│       ├── prompts/             #   Prompt 模板
│       └── ...
└── public/                      # 靜態資源
```

---

## 🚀 開始使用

### 前置需求

- **Node.js** ≥ 18
- **PostgreSQL** 資料庫（推薦 [Neon](https://neon.tech) 或 [Supabase](https://supabase.com)）
- **Cloudflare R2** 儲存桶（參考 `docs/SETUP_R2.md`）
- **Google OAuth** 憑證（[Google Cloud Console](https://console.cloud.google.com/apis/credentials)）
- **Anthropic API Key**（[Anthropic Console](https://console.anthropic.com)）

### 1. 複製專案

```bash
git clone https://github.com/your-username/LectureNoteAI.git
cd LectureNoteAI
```

### 2. 安裝依賴

```bash
npm install
```

> 安裝完成後會自動執行 `prisma generate` 產生 Prisma Client。

### 3. 設定環境變數

複製 `.env.example` 為 `.env`，並填入對應的值：

```bash
cp .env.example .env
```

```env
# PostgreSQL 資料庫
DATABASE_URL=           # 連線字串（pooled，供應用程式使用）
DIRECT_URL=             # 直連字串（供 Prisma migrate 使用）

# NextAuth 驗證
AUTH_SECRET=            # 隨機密鑰，可用 npx auth secret 產生
AUTH_GOOGLE_ID=         # Google OAuth Client ID
AUTH_GOOGLE_SECRET=     # Google OAuth Client Secret

# Anthropic AI
ANTHROPIC_API_KEY=      # API 金鑰
ANTHROPIC_BASE_URL=     # （選填）自訂 API 端點，用於代理
ANTHROPIC_MODEL=claude-sonnet-4-6  # 預設模型

# Cloudflare R2
R2_ACCOUNT_ID=          # R2 帳戶 ID
R2_ACCESS_KEY_ID=       # R2 Access Key
R2_SECRET_ACCESS_KEY=   # R2 Secret Key
R2_BUCKET=              # R2 Bucket 名稱
```

### 4. 初始化資料庫

```bash
npx prisma migrate deploy
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000) 即可開始使用。

---

## 🏗 建構與部署

### 建構正式版本

```bash
npm run build   # 執行 prisma migrate deploy + next build
npm run start   # 啟動正式伺服器
```

### 部署到 Vercel

本專案可直接部署到 [Vercel](https://vercel.com)：

1. 將專案推送到 GitHub
2. 在 Vercel 建立新專案並連結 GitHub 儲存庫
3. 在 Vercel 設定中加入所有環境變數
4. 部署完成！

> **注意**：PDF 上傳採用 Presigned URL 直傳 R2，不經過 Vercel Function，因此不受 body size 限制。

---

## 📊 資料模型

| 模型 | 說明 |
|------|------|
| `User` | 使用者帳戶 |
| `Document` | 上傳的 PDF 文件，含 R2 儲存路徑與 AI 偏好快照 |
| `Folder` | 資料夾（支援巢狀，透過 `parentId` 自我關聯） |
| `PageContent` | 逐頁擷取文字、快取摘要、prompt hash、是否為純圖片頁 |
| `QAEntry` | 問答紀錄（問題、選取文字、AI 回答） |
| `Note` | 逐頁使用者筆記（Markdown 格式） |
| `LibrarySettings` | 使用者全域 AI 偏好設定 |
| `UsageCounter` | 每日 API 使用量統計 |

---

## 📄 License

MIT
