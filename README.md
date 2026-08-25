# LectureNoteAI

**An AI-powered PDF study workspace for page-by-page summaries, contextual Q&A, and notes.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Claude](https://img.shields.io/badge/AI-Claude-orange)](https://www.anthropic.com/claude)

[Open the live app](https://lecture-note-ai-nine.vercel.app) · [Watch the demo](https://youtu.be/Cs3rGweGkYo) · [Report an issue](https://github.com/KrystalChang/LectureNoteAI/issues)

LectureNoteAI turns PDF lecture material into an interactive study environment. Upload a PDF, read it alongside streaming AI summaries, ask questions about selected text or diagrams, keep page-specific notes, and export your work as PDF, Word, or Markdown.

## Demo

[![LectureNoteAI reader showing a lecture slide beside an AI-generated summary](public/demo/reader-summary.png)](https://lecture-note-ai-nine.vercel.app)

The reader keeps the source page, AI summary, Q&A, and personal notes together in one workspace. For the complete walkthrough, [watch the demo video on YouTube](https://youtu.be/Cs3rGweGkYo).

## Features

- **Page-by-page AI summaries** — stream summaries as they are generated and cache them by prompt hash to avoid duplicate requests.
- **Contextual Q&A** — ask about the current page, selected text, or a captured diagram, formula, or chart using vision input.
- **Image-page detection** — automatically fall back to a full-page screenshot when a PDF page has too little extractable text.
- **Rich page notes** — write BlockNote-powered notes with headings, lists, formatting, and autosave.
- **Organized library** — upload PDFs up to 50 MB and arrange documents in nested folders.
- **Flexible exports** — download summaries and notes as PDF, Word (`.docx`), or Markdown.
- **Custom AI behavior** — configure document type, response style, language, and prompt templates at library or document level.
- **Usage plans and BYOK** — support free and Pro quotas or encrypted user-provided API keys.
- **Themes** — choose light, dark, system, preset accent colors, or a custom color.
- **Private multi-user data** — sign in with Google; documents, notes, settings, and usage are isolated by user.

## Architecture

| Area | Technology |
| --- | --- |
| Web application | Next.js 16 App Router, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL and Prisma ORM |
| Authentication | Auth.js / NextAuth v5 with Google OAuth and JWT sessions |
| AI | Anthropic Claude with streaming, vision, and prompt caching |
| Storage | Cloudflare R2 with browser-to-bucket presigned uploads |
| PDF | react-pdf and pdfjs-dist (legacy build for server-side extraction) |
| Notes | BlockNote |
| Math | KaTeX |
| Streaming | NDJSON over `application/x-ndjson` |

### Request flow

1. The browser requests a presigned upload URL and sends the PDF directly to Cloudflare R2.
2. The server extracts and stores text page by page.
3. Summary and Q&A routes resolve the user's plan or API key, reserve quota, and stream AI output as NDJSON.
4. Completed responses are cached or saved; failed and interrupted requests release their quota reservation.
5. Image-based pages and user-selected regions are sent as vision input when needed.

## Getting started

### Prerequisites

- Node.js 20.9 or later
- PostgreSQL, such as [Neon](https://neon.tech/) or [Supabase](https://supabase.com/)
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket
- Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- An [Anthropic API key](https://console.anthropic.com/)
- Stripe credentials if subscription billing is enabled

### Installation

```bash
git clone https://github.com/KrystalChang/LectureNoteAI.git
cd LectureNoteAI
npm install
cp .env.example .env
```

Complete the values documented in `.env.example`, then initialize the database and start the development server:

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> `APP_ENCRYPTION_KEY` protects user-supplied API keys with AES-256-GCM. Rotating it makes previously stored keys unreadable, so manage it like a production secret.

## Development

```bash
npm run dev       # Start the local development server
npm test          # Run the node:test suite
npm run lint      # Run ESLint
npm run build     # Apply Prisma migrations and create a production build
npm run start     # Start the production server
```

There is no browser end-to-end test suite yet. Before opening a pull request, run the tests and lint checks and manually verify the affected flow in the development server.

## Project structure

```text
prisma/
  schema.prisma                 Database schema
  migrations/                   Database migrations
src/
  app/                          Next.js pages and route handlers
    api/                        Upload, documents, AI, billing, and settings APIs
  components/                   Reader, library, notes, profile, and shared UI
  lib/
    ai/                         AI routing, execution, and provider adapters
    billing/                    Stripe and entitlement logic
    prompts/                    Prompt templates
    quota/                      Reservation-based usage accounting
    security/                   Encryption helpers
    page_store.ts               Page persistence
    r2.ts                       Cloudflare R2 access
public/
  demo/                         README and product demo assets
tests/                          Unit and route tests
```

## Deployment

The app can be deployed on [Vercel](https://vercel.com/). Connect the repository, configure every required variable from `.env.example`, and deploy. PDF files upload directly to R2 through presigned URLs instead of passing through a Vercel Function.

Set `NEXT_PUBLIC_SITE_URL` to the public origin when deploying under a different domain. The current hosted instance is [lecture-note-ai-nine.vercel.app](https://lecture-note-ai-nine.vercel.app).

## Related project

LectureNoteAI can be extended with a Model Context Protocol server for additional tools and workflows. See the [MCP Server repository](https://github.com/TrendMicro-Proactive-monitoring-system/MCP-Server).

## Contributing

Contributions are welcome. Fork the repository, create a focused branch, run the validation commands above, and open a pull request describing the change and how it was verified.

## License

MIT
