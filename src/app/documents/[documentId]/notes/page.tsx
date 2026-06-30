"use client";

import { use, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import Markdown from "@/components/markdown";

type CompiledPage = {
  pageNumber: number;
  isImageBased: boolean;
  summary: string | null;
  note: string | null;
  placeholder: boolean;
};
type CompiledNotes = {
  title: string;
  generatedAt: string;
  pages: CompiledPage[];
};

const IMAGE_PLACEHOLDER =
  "（本頁以圖片為主，AI 圖片摘要需在閱讀頁面時即時產生；此處未包含。）";

export default function NotesPrintPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const [notes, setNotes] = useState<CompiledNotes | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch(`/api/documents/${documentId}/export?format=json`)
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json();
      })
      .then((data) => {
        if (!ignore) setNotes(data);
      })
      .catch(() => {
        if (!ignore) setError("無法載入筆記，請稍後再試。");
      });
    return () => {
      ignore = true;
    };
  }, [documentId]);

  return (
    <div className="notes-print min-h-screen">
      {/* The print sheet is always light (paper-like), independent of the app
          theme. We pin colours explicitly so the shared `.markdown` styles —
          which follow the app's dark/light tokens elsewhere — stay dark-on-white
          here and remain readable when exported to PDF. */}
      <style>{`
        .notes-print { background:#ffffff; color:#1f2937; }
        .notes-print .sheet { max-width: 820px; margin: 0 auto; padding: 48px 44px 90px; }
        .notes-print h1 { font-size: 1.95rem; font-weight: 700; color:#111827; margin-bottom: 4px; }
        .notes-print .meta { color:#6b7280; font-size: 0.85rem; margin-bottom: 32px; }
        .notes-print .page-block { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb; }
        .notes-print .page-block:last-child { border-bottom: none; }
        .notes-print .page-head { display:flex; align-items:center; gap:8px; margin-bottom: 10px; }
        .notes-print .page-title { font-size: 1.15rem; font-weight: 700; color:#111827; }
        .notes-print .img-badge { font-size:0.7rem; font-weight:600; color:#4f46e5; background:#eef2ff; border-radius:999px; padding:2px 9px; }
        .notes-print .note-card { margin-top: 14px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; padding: 12px 14px; }
        .notes-print .note-label { font-weight:600; font-size:0.8rem; color:#4f46e5; margin-bottom: 4px; }
        .notes-print .placeholder { color:#9ca3af; font-style: italic; }

        /* Pin the shared markdown styles to light colours for the print sheet. */
        .notes-print .markdown { color:#1f2937; }
        .notes-print .markdown h1, .notes-print .markdown h2, .notes-print .markdown h3 { color:#111827; }
        .notes-print .markdown a { color:#4f46e5; }
        .notes-print .markdown code { background:#f3f4f6; color:#111827; }
        .notes-print .markdown pre { background:#f3f4f6; }
        .notes-print .markdown blockquote { color:#4b5563; border-left-color:#d1d5db; }
        .notes-print .markdown th { background:#f3f4f6; }
        .notes-print .markdown th, .notes-print .markdown td { border-color:#e5e7eb; }

        .toolbar { position: sticky; top: 0; z-index: 10; display:flex; justify-content:flex-end; gap:8px; padding:12px 16px; background:#f6f7f9; border-bottom:1px solid #e5e7eb; }
        .print-btn { display:inline-flex; align-items:center; gap:8px; background:#4f46e5; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-size:0.875rem; font-weight:500; cursor:pointer; }
        .print-btn:hover { background:#4338ca; }
        @media print {
          .toolbar { display: none; }
          .notes-print .page-block { break-inside: avoid; }
        }
      `}</style>

      <div className="toolbar">
        <button className="print-btn" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> 列印 / 存成 PDF
        </button>
      </div>

      <div className="sheet">
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
        {!notes && !error && <p style={{ color: "#6b7280" }}>整理筆記中…</p>}

        {notes && (
          <>
            <h1>{notes.title} — 筆記</h1>
            <p className="meta">
              由 LectureNoteAI 於{" "}
              {new Date(notes.generatedAt).toLocaleString("zh-TW")} 整理
            </p>

            {notes.pages.map((page) => (
              <section key={page.pageNumber} className="page-block">
                <div className="page-head">
                  <span className="page-title">第 {page.pageNumber} 頁</span>
                  {page.isImageBased && <span className="img-badge">圖片頁</span>}
                </div>
                {page.summary ? (
                  <Markdown>{page.summary}</Markdown>
                ) : (
                  <p className="placeholder">
                    {page.placeholder ? IMAGE_PLACEHOLDER : "（無摘要）"}
                  </p>
                )}
                {page.note && (
                  <div className="note-card">
                    <p className="note-label">我的筆記</p>
                    <Markdown>{page.note}</Markdown>
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
