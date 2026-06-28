"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const NoteEditor = dynamic(() => import("./note_editor"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-gray-500">Loading editor...</p>,
});

type PageNotesProps = {
  documentId: string;
  pageNumber: number;
};

type Note = {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export default function PageNotes({ documentId, pageNumber }: PageNotesProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [initialMarkdown, setInitialMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const latestContentRef = useRef("");
  const savedContentRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchNote() {
      try {
        const response = await fetch(
          `/api/documents/${documentId}/pages/${pageNumber}/notes`,
        );
        const data = await response.json();

        if (ignore) return;

        if (!response.ok) {
          setError(data.error || "Failed to fetch note");
          return;
        }

        const markdown = data.note?.content ?? "";
        setNote(data.note);
        setInitialMarkdown(markdown);
        latestContentRef.current = markdown;
        savedContentRef.current = markdown;
      } catch {
        if (!ignore) setError("網路錯誤，無法取得筆記");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchNote();

    return () => {
      ignore = true;
    };
  }, [documentId, pageNumber]);

  async function persistLatestNote() {
    if (saveInFlightRef.current) return;

    const contentToSave = latestContentRef.current;
    if (contentToSave === savedContentRef.current) return;

    saveInFlightRef.current = true;
    let savedSuccessfully = false;

    if (mountedRef.current) {
      setSaveStatus("saving");
      setError("");
    }

    try {
      const response = await fetch(
        `/api/documents/${documentId}/pages/${pageNumber}/notes`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: contentToSave }),
          keepalive: true,
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save note");
      }

      savedContentRef.current = contentToSave;
      savedSuccessfully = true;

      if (mountedRef.current) {
        setNote(data.note);
        setSaveStatus(
          latestContentRef.current === contentToSave ? "saved" : "pending",
        );
      }
    } catch (saveError) {
      if (mountedRef.current) {
        setSaveStatus("error");
        setError(
          saveError instanceof Error
            ? saveError.message
            : "網路錯誤，無法儲存筆記",
        );
      }
    } finally {
      saveInFlightRef.current = false;

      if (
        savedSuccessfully &&
        latestContentRef.current !== savedContentRef.current
      ) {
        saveTimerRef.current = setTimeout(() => {
          void persistLatestNote();
        }, 0);
      }
    }
  }

  function handleEditorChange(markdown: string) {
    latestContentRef.current = markdown;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    if (markdown === savedContentRef.current) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("pending");
    saveTimerRef.current = setTimeout(() => {
      void persistLatestNote();
    }, 700);
  }

  const statusText = {
    idle: "",
    pending: "Unsaved changes",
    saving: "Saving...",
    saved: "Saved",
    error: "Save failed",
  }[saveStatus];

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">Notes</h3>
        <p
          className={saveStatus === "error" ? "text-red-600" : "text-gray-400"}
          aria-live="polite"
        >
          {statusText}
        </p>
      </div>

      {loading && <p className="text-gray-500">Loading note...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && (
        <section className="overflow-hidden rounded border border-gray-300 bg-white">
          <NoteEditor
            initialMarkdown={initialMarkdown}
            onChange={handleEditorChange}
          />

          {note && (
            <p className="border-t border-gray-200 px-3 py-2 text-xs text-gray-400">
              Last updated: {new Date(note.updatedAt).toLocaleString()}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
