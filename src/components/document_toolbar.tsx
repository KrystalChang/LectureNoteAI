"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileDown,
  FileText,
  FileType2,
  Loader2,
} from "lucide-react";
import ThemeControls from "./theme_controls";
import UserMenu, { type SessionUser } from "./user_menu";

type DocumentToolbarProps = {
  documentId: string;
  title: string;
  user?: SessionUser | null;
};

export default function DocumentToolbar({
  documentId,
  title,
  user,
}: DocumentToolbarProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function downloadFile(format: "md" | "docx") {
    setBusy(format);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/export?format=${format}`,
      );
      if (!response.ok) throw new Error("export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title}-筆記.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("匯出失敗，請稍後再試。");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  function exportPdf() {
    window.open(`/documents/${documentId}/notes`, "_blank", "noopener");
    setOpen(false);
  }

  return (
    <header
      className="flex items-center justify-between gap-3 border-b px-5 py-2.5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="btn btn-subtle h-8 px-2" title="返回">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">返回</span>
        </Link>
        <h1 className="truncate text-sm font-medium">{title}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-primary"
            aria-expanded={open}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">下載筆記</span>
          </button>

          {open && (
            <div
              className="card absolute right-0 top-11 z-50 w-60 p-1.5"
              style={{ boxShadow: "var(--shadow-lg)" }}
            >
              <p className="px-2 py-1.5 text-xs text-muted">
                整合每頁摘要與筆記
              </p>
              <MenuItem
                icon={<FileType2 className="h-4 w-4" />}
                label="PDF（列印 / 存成 PDF）"
                onClick={exportPdf}
              />
              <MenuItem
                icon={
                  busy === "docx" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )
                }
                label="Word（.docx）"
                onClick={() => void downloadFile("docx")}
                disabled={busy !== null}
              />
              <MenuItem
                icon={
                  busy === "md" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )
                }
                label="Markdown（.md）"
                onClick={() => void downloadFile("md")}
                disabled={busy !== null}
              />
            </div>
          )}
        </div>

        <ThemeControls />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50"
      style={{ color: "var(--text)" }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--surface-2)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}
