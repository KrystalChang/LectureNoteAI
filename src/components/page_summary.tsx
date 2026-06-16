"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PageSummaryProps = {
  documentId: string;
  pageNumber: number;
};

type SummaryState =
  | { status: "loading"; summary: ""; error: "" }
  | { status: "success"; summary: string; error: "" }
  | { status: "error"; summary: ""; error: string };

export default function PageSummary({
  documentId,
  pageNumber,
}: PageSummaryProps) {
  const [summaryState, setSummaryState] = useState<SummaryState>({
    status: "loading",
    summary: "",
    error: "",
  });

  useEffect(() => {
    // Guard: if the user switches pages while a request is in flight,
    // the older response could clobber the newer one. `cancelled` makes
    // the stale response a no-op.
    let cancelled = false;

    async function fetchSummary() {
      try {
        const response = await fetch(
          `/api/documents/${documentId}/pages/${pageNumber}/summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId, pageNumber }),
          },
        );
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setSummaryState({
            status: "error",
            summary: "",
            error: data.error || "Failed to fetch summary",
          });
        } else {
          setSummaryState({
            status: "success",
            summary: data.summary,
            error: "",
          });
        }
      } catch {
        if (!cancelled) {
          setSummaryState({
            status: "error",
            summary: "",
            error: "網路錯誤，無法取得摘要",
          });
        }
      }
    }

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [documentId, pageNumber]);

  if (summaryState.status === "loading") {
    return (
      <div className="space-y-2 animate-pulse" aria-label="Loading summary">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (summaryState.status === "error") {
    return <p className="text-sm text-red-600">{summaryState.error}</p>;
  }

  return (
    <div className="markdown text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {summaryState.summary}
      </ReactMarkdown>
    </div>
  );
}
