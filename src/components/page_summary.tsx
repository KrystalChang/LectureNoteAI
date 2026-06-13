"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PageSummaryProps = {
  documentId: string;
  pageNumber: number;
};

export default function PageSummary({
  documentId,
  pageNumber,
}: PageSummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard: if the user switches pages while a request is in flight,
    // the older response could clobber the newer one. `cancelled` makes
    // the stale response a no-op.
    let cancelled = false;

    setLoading(true);
    setError("");
    setSummary("");

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
          setError(data.error || "Failed to fetch summary");
        } else {
          setSummary(data.summary);
        }
      } catch {
        if (!cancelled) setError("網路錯誤，無法取得摘要");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [documentId, pageNumber]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse" aria-label="Loading summary">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="markdown text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
    </div>
  );
}
