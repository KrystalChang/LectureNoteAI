"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UploadCloud } from "lucide-react";
import {
  DEFAULT_PROMPT_PREFERENCES,
  DocumentFormat,
  PromptPreferences,
  applyDocumentFormat,
  mergePromptPreferences,
} from "@/lib/prompt_preferences";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB, per PRD §5.1

const DOCUMENT_FORMATS: Array<{ value: DocumentFormat; label: string }> = [
  { value: "slides", label: "簡報" },
  { value: "paper", label: "論文" },
  { value: "textbook", label: "課本" },
  { value: "exam", label: "考題" },
  { value: "custom", label: "自訂" },
];

const TONES: Array<{ value: PromptPreferences["tone"]; label: string }> = [
  { value: "detailed", label: "詳細" },
  { value: "concise", label: "簡潔" },
  { value: "teaching", label: "教學語氣" },
];

const SUMMARY_FORMATS: Array<{
  value: PromptPreferences["summaryFormat"];
  label: string;
}> = [
  { value: "bullets", label: "條列式" },
  { value: "full", label: "完整說明" },
  { value: "exam", label: "考前重點整理" },
];

type UploadPageProps = {
  folderId?: string | null;
  navigateAfterUpload?: boolean;
  onUploadComplete?: (document: UploadedDocument) => void;
};

export type UploadedDocument = {
  documentId: string;
  originalName: string;
  storedFilename: string;
  totalPages: number | null;
  folderId: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage({
  folderId = null,
  navigateAfterUpload = true,
  onUploadComplete,
}: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [preferences, setPreferences] = useState<PromptPreferences>(
    DEFAULT_PROMPT_PREFERENCES,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  // Seed the upload dialog with the library-wide general defaults.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (!ignore && response.ok && data.preferences) {
          setPreferences(mergePromptPreferences(data.preferences));
        }
      } catch {
        /* keep defaults on failure */
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  function validateAndSetFile(f: File | null) {
    setError("");
    if (!f) {
      setFile(null);
      return;
    }
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("目前僅支援 PDF 檔案。");
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`檔案過大（${formatBytes(f.size)}），上限為 50 MB。`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) {
      setError("請先選擇一份 PDF 檔案。");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      // 1) Ask the server for a presigned R2 upload URL.
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          contentType: file.type || "application/pdf",
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || "上傳失敗，請稍後再試。");
        return;
      }

      // 2) PUT the PDF straight to R2 (bypasses the API server entirely).
      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!putRes.ok) {
        setError("檔案上傳到儲存空間失敗，請稍後再試。");
        return;
      }

      // 3) Tell the server to register the document (text extraction + DB row).
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presignData.key,
          originalName: file.name,
          folderId: folderId ?? "",
          promptPreferences: JSON.stringify(preferences),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "上傳失敗，請稍後再試。");
        return;
      }

      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      onUploadComplete?.(data);

      if (navigateAfterUpload) {
        router.push(`/documents/${data.documentId}`);
      }
    } catch {
      setError("網路錯誤，請稍後再試。");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          validateAndSetFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors"
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--border-strong)",
          background: isDragging
            ? "color-mix(in srgb, var(--accent) 8%, transparent)"
            : "var(--surface-2)",
        }}
      >
        <UploadCloud
          className="h-10 w-10"
          style={{ color: isDragging ? "var(--accent)" : "var(--text-faint)" }}
          aria-hidden="true"
        />

        {file ? (
          <div className="text-center">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <div className="text-center">
            <p>
              <span className="font-medium" style={{ color: "var(--accent)" }}>
                點擊選擇檔案
              </span>
              ，或直接拖曳到這裡
            </p>
            <p className="mt-0.5 text-sm text-muted">限 PDF，最大 50 MB</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-900">文件格式</p>
        <p className="mt-0.5 text-xs text-gray-500">
          選擇後會自動帶入建議的口吻與摘要格式，仍可自行調整。
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {DOCUMENT_FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              onClick={() =>
                setPreferences((current) =>
                  applyDocumentFormat(current, format.value),
                )
              }
              className={`h-9 rounded border px-2 text-sm ${
                preferences.documentFormat === format.value
                  ? "chip-selected font-medium"
                  : "chip-unselected"
              }`}
            >
              {format.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-3 text-sm font-medium text-blue-600 hover:underline"
        >
          {showAdvanced ? "隱藏進階設定" : "調整口吻與摘要格式"}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-700">口吻</p>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        tone: tone.value,
                      }))
                    }
                    className={`h-9 rounded border px-2 text-sm ${
                      preferences.tone === tone.value
                        ? "chip-selected font-medium"
                        : "chip-unselected"
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-700">
                摘要格式
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SUMMARY_FORMATS.map((summaryFormat) => (
                  <button
                    key={summaryFormat.value}
                    type="button"
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        summaryFormat: summaryFormat.value,
                      }))
                    }
                    className={`h-9 rounded border px-2 text-sm ${
                      preferences.summaryFormat === summaryFormat.value
                        ? "chip-selected font-medium"
                        : "chip-unselected"
                    }`}
                  >
                    {summaryFormat.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs font-semibold text-gray-700">
              額外指令
              <textarea
                value={preferences.extraInstructions}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    extraInstructions: event.target.value,
                  }))
                }
                placeholder="例如：保留英文術語、多舉例說明..."
                className="textarea mt-1.5 min-h-16 font-normal"
              />
            </label>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="btn btn-primary mt-4 h-11 w-full"
      >
        {isUploading && (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isUploading ? "上傳並解析中…" : "開始上傳"}
      </button>

      {error && (
        <p className="mt-3 text-center text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
