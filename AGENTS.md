<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LectureNoteAI

AI 驅動的 PDF 講義閱讀工具:上傳 PDF 後逐頁產生 AI 摘要、支援選取/圈選提問(Vision)、逐頁筆記(BlockNote),可匯出 PDF/Word/Markdown。多使用者,Google OAuth 登入,資料嚴格按使用者隔離。

## 技術棧

Next.js 16 (App Router) + React 19 + TypeScript 5、Tailwind CSS v4、PostgreSQL + Prisma、NextAuth v5(Google OAuth + JWT)、Anthropic Claude API(串流 + Vision + Prompt Caching)、Cloudflare R2(S3 相容,PDF 儲存)、BlockNote 筆記編輯器、KaTeX 數學公式。

## 常用指令

```bash
npm run dev                # 開發伺服器 (localhost:3000)
npm run build              # prisma migrate deploy + next build
npm run lint               # ESLint (flat config)
npx prisma migrate dev     # 修改 schema 後建立 migration
npx prisma db push         # 快速同步 schema(也會重新產生 Prisma Client)
npx prisma studio          # 瀏覽資料庫
```

- **沒有測試框架**——驗證方式是 `npm run lint` + 手動跑 dev server。
- `npm install` 會透過 postinstall 自動執行 `prisma generate`。
- 環境變數見 `.env.example`(有完整註解);本機開發需要 Postgres(Neon/Supabase)、R2、Google OAuth、Anthropic API key。

## 架構

- `src/proxy.ts` — 路由守衛(Next 16 用 `proxy.ts`,**不是** `middleware.ts`)。只保護頁面;API 的鑑權在各 route handler 內處理。
- `src/auth.ts` — NextAuth v5 設定。
- `src/app/api/` — 所有後端邏輯都在 route handlers:
  - `upload/presign` + `upload` — 兩步驟上傳:先 presign,瀏覽器直傳 R2(不經過 server,避開 body size 限制),再 finalize。
  - `documents/[documentId]/pages/[pageNum]/summary`、`qa` — AI 串流端點。
- `src/lib/` — 核心邏輯:
  - `ai.ts` — Anthropic SDK 封裝(摘要、問答、設定建議)。
  - `prompts/` — 所有 prompt 模板集中在這裡,支援 `{{pageText}}`、`{{selectedText}}`、`{{question}}` 等變數。
  - `ndjson.ts` + `stream_client.ts` — 自訂 NDJSON 串流協議(`application/x-ndjson`),server 端用 `ndjsonResponse()`,訊息型別:`meta` / `delta` / `needsImage` / `done` / `error`。
  - `page_store.ts`、`prefs_store.ts` — 資料庫存取層;route 不直接寫複雜的 Prisma 查詢。
  - `r2.ts` — R2/S3 操作;`pdf.ts` — 伺服器端文字擷取(pdfjs-dist **legacy build**)。
- `src/components/` — 主要元件:`pdf_viewer.tsx`(檢視 + 圈選截圖)、`pageChat.tsx`(摘要/問答面板)、`note_editor.tsx`(BlockNote)、`library_browser.tsx`(檔案庫)。

### 關鍵資料流

登入 → presign 直傳 PDF 到 R2 → 伺服器逐頁擷取文字存入 `PageContent` → 檢視頁面時串流產生摘要並以 **prompt hash 快取**(相同設定不重打 API)→ 文字太少的頁面標記 `isImageBased`,由 client 送整頁截圖走 Vision。

## 慣例

- **檔名用 snake_case**(`pdf_viewer.tsx`、`auth_helpers.ts`)。
- **鑑權模式**:每個碰使用者資料的 API route 都必須用 `src/lib/auth_helpers.ts` 的 `getUserId()` + `userOwnsDocument()`。查無擁有權時回 **404 而非 403**(避免資源 id 被探測)。所有查詢都要帶 `userId` 過濾。
- Prompt 相關字串一律放 `src/lib/prompts/`,不要散落在 route 裡。
- 註解可用繁體中文或英文,跟隨周邊程式碼。
- AI 模型由 `ANTHROPIC_MODEL` 環境變數控制(預設 `claude-sonnet-4-6`),程式內用 `src/lib/ai.ts` 匯出的 `AI_MODEL`,不要硬編模型名。

## 注意事項(Gotchas)

- **Next.js 16 有 breaking changes**——寫任何 Next 相關程式碼前,先讀 `node_modules/next/dist/docs/` 的對應章節(見本檔開頭警告)。例如 middleware 已改名為 `proxy.ts`。
- 改了 `prisma/schema.prisma` 後必須跑 `npx prisma db push`(或 `migrate dev`)重新產生 client,否則型別對不上。
- `DATABASE_URL` 是 pooled 連線給 app 用;`DIRECT_URL` 是直連,只給 `prisma migrate` 用——兩者都要設。
- `APP_ENCRYPTION_KEY` 用於加密使用者自帶的 API key(BYOK, AES-256-GCM);**換掉它會讓所有已存的使用者 key 失效**。
- 免費用戶共用伺服器的 Anthropic key,每日用量由 `UsageCounter` + `FREE_DAILY_LIMIT`(預設 20)把關;新增會呼叫 AI 的端點時記得接上用量檢查。
- 伺服器端 PDF 文字擷取必須用 pdfjs-dist 的 legacy build(非 legacy 版在 Node 環境會炸)。
- `.env` 含真實金鑰,已被 gitignore——不要 commit,也不要把值寫進任何文件。
