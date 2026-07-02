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
      setError("Only PDF files are accepted.");
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large (${formatBytes(f.size)}). Max size is 50 MB.`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderId", folderId ?? "");
      formData.append("promptPreferences", JSON.stringify(preferences));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      onUploadComplete?.(data);

      if (navigateAfterUpload) {
        router.push(`/documents/${data.documentId}`);
      }
    } catch {
      setError("Something went wrong.");
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
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        <UploadCloud className="h-10 w-10 text-gray-400" aria-hidden="true" />

        {file ? (
          <div className="text-center">
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-700">
              <span className="font-medium text-blue-600">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="text-sm text-gray-500">PDF only, up to 50 MB</p>
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
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                        ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                        ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                className="mt-1.5 min-h-16 w-full rounded border border-gray-300 p-2 text-sm font-normal outline-none focus:border-blue-500"
              />
            </label>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading && (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
