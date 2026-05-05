# LectureNoteAI — Product Requirements Document

## 1. Product Overview

LectureNoteAI is a learning tool that allows users to upload lecture slides or presentation PDFs, receive AI-generated summaries for each page, ask questions about specific content, and take notes — all in a single integrated interface.

### Vision

Reduce the time students spend re-reading dense lecture materials by providing instant, page-level AI summaries and an interactive Q&A experience tied directly to the source content.

### Target Users

- University / graduate students reviewing lecture slides
- Self-learners studying from PDF-based course materials
- Professionals reviewing training or presentation decks

---

## 2. Problem Statement

Students often receive lecture slides that are dense, fragmented, or lack context without the instructor's verbal explanation. Current workflows involve:

1. Reading slides page by page and manually taking notes
2. Switching between the PDF and a separate AI chat to ask questions (losing context)
3. No easy way to link notes back to the exact page or passage

LectureNoteAI solves this by embedding AI summarization, Q&A, and note-taking directly alongside the PDF viewer.

---

## 3. MVP Scope

### 3.1 Core Features

| #   | Feature                 | Description                                                                                                                                                                                             |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **PDF Upload**          | User uploads a PDF file (lecture slides, handouts). System validates file type and size.                                                                                                                |
| F2  | **PDF Viewer**          | Render the PDF page-by-page in the main content area with page navigation (prev / next / jump to page).                                                                                                 |
| F3  | **Per-Page AI Summary** | When the user views a page, an AI-generated summary is displayed in the right panel. Summaries are generated on first view and cached for subsequent visits.                                            |
| F4  | **Text Selection Q&A**  | User selects text on any page → a floating action button appears → clicking it opens a Q&A panel where the user can ask questions about the selected passage. AI answers with the full page as context. |
| F5  | **Basic Notes**         | User can create, edit, and delete text notes attached to a specific page. Notes persist across sessions.                                                                                                |

### 3.2 Out of Scope (v1)

- Multi-file / workspace management
- Collaboration / sharing
- Handwriting / drawing on PDF
- Export notes to external formats (Notion, Markdown)
- OCR for scanned / image-based PDFs
- Mobile-native app (responsive web only)

---

## 4. User Flow

```
┌──────────────┐
│ Landing Page │
│ (Upload PDF) │
└──────┬───────┘
       │ drag-and-drop or file picker
       ▼
┌──────────────────────────────────────────────────────┐
│                    Main Workspace                     │
│                                                      │
│  ┌─────────────────────┐  ┌───────────────────────┐  │
│  │                     │  │   Right Panel          │  │
│  │    PDF Viewer        │  │                       │  │
│  │                     │  │  ┌─ AI Summary ──────┐ │  │
│  │   (page content)    │  │  │ Page N summary ... │ │  │
│  │                     │  │  └───────────────────┘ │  │
│  │                     │  │                       │  │
│  │  [select text] ───────▶│  ┌─ Q&A ────────────┐ │  │
│  │                     │  │  │ Q: ...            │ │  │
│  │                     │  │  │ A: ...            │ │  │
│  │                     │  │  └───────────────────┘ │  │
│  │                     │  │                       │  │
│  │                     │  │  ┌─ Notes ───────────┐ │  │
│  │                     │  │  │ + Add note         │ │  │
│  │                     │  │  │ • note 1           │ │  │
│  │                     │  │  └───────────────────┘ │  │
│  │  ◀ Page 3 / 42 ▶   │  │                       │  │
│  └─────────────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Step-by-Step

1. **Upload PDF** — User lands on the home page, drags a PDF or clicks "Upload". System validates and processes the file.
2. **Open Document** — PDF renders in the viewer. Page 1 is shown by default.
3. **View a Page** — User navigates to any page. The right panel automatically loads the AI summary for that page.
4. **Read Summary** — AI summary appears in the right panel (generated on first view, cached afterward).
5. **Select Text → Ask AI** — User highlights a passage on the page. A "Ask AI" button appears. Clicking it opens the Q&A section with the selected text as context. User types a question, AI responds.
6. **Take Notes** — User clicks "+ Add note" in the Notes section. A text editor appears, tied to the current page. Notes are saved automatically.

---

## 5. Functional Requirements

### 5.1 PDF Upload (F1)

| Requirement      | Detail                                                |
| ---------------- | ----------------------------------------------------- |
| Supported format | `.pdf` only                                           |
| Max file size    | 50 MB                                                 |
| Upload method    | Drag-and-drop zone + file picker button               |
| Validation       | Reject non-PDF files with clear error message         |
| Processing       | Extract text content per page on upload (server-side) |
| Storage          | Store original PDF and extracted text                 |

### 5.2 PDF Viewer (F2)

| Requirement | Detail                                              |
| ----------- | --------------------------------------------------- |
| Rendering   | Use pdf.js (or equivalent) for in-browser rendering |
| Navigation  | Previous / Next buttons, page number input for jump |
| Zoom        | Fit-to-width by default, zoom in/out controls       |
| Text layer  | Selectable text overlay on rendered pages           |
| Performance | Lazy-load pages; render current page + 1 ahead      |

### 5.3 Per-Page AI Summary (F3)

| Requirement    | Detail                                                 |
| -------------- | ------------------------------------------------------ |
| Trigger        | Auto-generate when a page is first viewed              |
| Caching        | Store generated summary; do not re-generate on revisit |
| Display        | Right panel, "Summary" tab/section                     |
| Length         | 3–5 bullet points or ~150 words                        |
| Loading state  | Skeleton / spinner while generating                    |
| Error handling | Show retry button if generation fails                  |
| AI model       | Claude API (Sonnet for cost efficiency)                |

### 5.4 Text Selection Q&A (F4)

| Requirement   | Detail                                                      |
| ------------- | ----------------------------------------------------------- |
| Trigger       | User selects text on PDF → floating "Ask AI" button appears |
| Context       | Send selected text + full page text as context to AI        |
| Input         | Free-form text input for user question                      |
| Output        | AI response displayed in Q&A section                        |
| History       | Keep Q&A history per page within the session                |
| Loading state | Streaming response with typing indicator                    |

### 5.5 Basic Notes (F5)

| Requirement | Detail                                              |
| ----------- | --------------------------------------------------- |
| Create      | "+" button to add a new note on the current page    |
| Edit        | Click note to edit inline                           |
| Delete      | Delete button on each note (with confirmation)      |
| Persistence | Save to database, survive page refresh and re-login |
| Association | Each note is tied to a specific page number         |
| Format      | Plain text (MVP); rich text in future versions      |

---

## 6. Non-Functional Requirements

| Category           | Requirement                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Performance**    | PDF page render < 1s; AI summary generation < 5s; Q&A response starts streaming < 2s                       |
| **Scalability**    | Support up to 200-page PDFs; handle concurrent users via serverless / auto-scaling                         |
| **Security**       | Uploaded PDFs are private to the user; API keys never exposed to client; file uploads scanned for validity |
| **Accessibility**  | Keyboard navigation for PDF viewer; screen-reader labels on controls                                       |
| **Responsiveness** | Desktop-first (1024px+); usable on tablet (768px+); not optimized for mobile                               |
| **Data retention** | User files and notes retained until user deletes them                                                      |

---

## 7. Technical Architecture (Recommended)

```
┌────────────┐       ┌──────────────┐       ┌──────────────┐
│  Frontend   │──────▶│   Backend    │──────▶│  Claude API  │
│  Next.js    │◀──────│   Next.js    │◀──────│  (Sonnet)    │
│  + pdf.js   │       │   API Routes │       └──────────────┘
└────────────┘       │              │
                      │   ┌────────┐ │
                      │   │ SQLite │ │  (or PostgreSQL)
                      │   │ / DB   │ │
                      │   └────────┘ │
                      │   ┌────────┐ │
                      │   │ File   │ │  (local / S3)
                      │   │Storage │ │
                      │   └────────┘ │
                      └──────────────┘
```

| Layer         | Technology                         | Rationale                                           |
| ------------- | ---------------------------------- | --------------------------------------------------- |
| Frontend      | Next.js (App Router) + TypeScript  | Full-stack in one repo; SSR for SEO on landing page |
| PDF Rendering | react-pdf (wraps pdf.js)           | Well-maintained React wrapper                       |
| Styling       | Tailwind CSS + shadcn/ui           | Rapid UI development, consistent design             |
| Backend       | Next.js API Routes                 | Colocated with frontend; serverless-ready           |
| Database      | SQLite (dev) / PostgreSQL (prod)   | Simple for MVP; Prisma ORM for portability          |
| File Storage  | Local filesystem (dev) / S3 (prod) | PDF storage                                         |
| AI            | Claude API (claude-sonnet-4-6)     | Cost-efficient for summarization and Q&A            |
| Auth          | NextAuth.js (optional for MVP)     | Add when multi-user is needed                       |
| Deployment    | Vercel                             | Zero-config for Next.js                             |

---

## 8. Data Model

```
Document
├── id: UUID
├── filename: string
├── uploadedAt: datetime
├── totalPages: int
├── filePath: string  (path to stored PDF)
└── userId: string (optional, for future auth)

PageContent
├── id: UUID
├── documentId: FK → Document
├── pageNumber: int
├── extractedText: text
└── summary: text (nullable, populated on first view)

QAEntry
├── id: UUID
├── documentId: FK → Document
├── pageNumber: int
├── selectedText: text
├── question: text
├── answer: text
└── createdAt: datetime

Note
├── id: UUID
├── documentId: FK → Document
├── pageNumber: int
├── content: text
├── createdAt: datetime
└── updatedAt: datetime
```

---

## 9. API Endpoints

| Method | Endpoint                                    | Description                                           |
| ------ | ------------------------------------------- | ----------------------------------------------------- |
| POST   | `/api/documents/upload`                     | Upload PDF, extract text per page, return document ID |
| GET    | `/api/documents/:id`                        | Get document metadata                                 |
| GET    | `/api/documents/:id/pages/:pageNum`         | Get page content and summary                          |
| POST   | `/api/documents/:id/pages/:pageNum/summary` | Generate summary for a page (if not cached)           |
| POST   | `/api/documents/:id/qa`                     | Submit a question with selected text, get AI answer   |
| GET    | `/api/documents/:id/pages/:pageNum/notes`   | List notes for a page                                 |
| POST   | `/api/documents/:id/pages/:pageNum/notes`   | Create a note                                         |
| PUT    | `/api/notes/:id`                            | Update a note                                         |
| DELETE | `/api/notes/:id`                            | Delete a note                                         |

---

## 10. UI/UX Design Guidelines

- **Layout**: Two-panel split — PDF viewer (60% width) | Right panel (40% width)
- **Right panel tabs**: Summary / Q&A / Notes — switchable via tabs
- **Color palette**: Clean, academic feel — white background, soft blue accents, dark text
- **Typography**: Inter or system font; monospace for code blocks in AI responses
- **Interactions**:
  - Text selection triggers a non-intrusive floating button near the cursor
  - Summaries fade in with a subtle animation
  - Notes auto-save with a "Saved" indicator
- **Empty states**: Clear prompts when no summary, no Q&A history, or no notes exist

---

## 11. Success Metrics

| Metric                 | Target (3 months post-launch)                 |
| ---------------------- | --------------------------------------------- |
| Upload completion rate | > 90% of started uploads succeed              |
| Summary read rate      | > 70% of viewed pages have their summary read |
| Q&A usage              | Average 3+ questions per session              |
| Note creation          | > 30% of sessions include at least one note   |
| Return rate            | > 40% of users return within 7 days           |

---

## 12. Milestones

| Phase                | Scope                                                     | Timeline |
| -------------------- | --------------------------------------------------------- | -------- |
| **Phase 1 — Core**   | PDF upload + viewer + per-page summary                    | Week 1–2 |
| **Phase 2 — Q&A**    | Text selection + AI Q&A                                   | Week 3   |
| **Phase 3 — Notes**  | Note CRUD, page-level persistence                         | Week 4   |
| **Phase 4 — Polish** | Error handling, loading states, responsive layout, deploy | Week 5   |

---

## 13. Risks & Mitigations

| Risk                               | Impact                               | Mitigation                                                         |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Large PDFs cause slow processing   | Poor UX on upload                    | Async processing with progress bar; paginate text extraction       |
| AI hallucination in summaries      | Misleading content                   | Prompt engineering to stay faithful to source text; add disclaimer |
| API cost scaling                   | Budget overrun                       | Cache summaries aggressively; use Haiku for simpler tasks          |
| PDF text extraction quality varies | Bad summaries for image-heavy slides | Show warning for low-text pages; plan OCR for v2                   |

---

## 14. Future Enhancements (Post-MVP)

- **Multi-document workspace** — manage multiple PDFs in folders
- **Export** — download notes as Markdown / Notion integration
- **Flashcard generation** — AI generates review cards from summaries
- **Collaboration** — share annotated PDFs with classmates
- **OCR support** — handle scanned documents and image-based slides
- **Mobile app** — React Native or PWA
- **Audio sync** — upload lecture recording and sync with slides
