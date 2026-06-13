"use client";

import { useEffect, useState } from "react";

type PageSummaryProps = {
  documentId: string;
  pageNumber: number;
};

export default function PageSummary({
  documentId,
  pageNumber,
}: PageSummaryProps) {
  const [summary, setSummary] = useState<string>("Loading summary...");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchSummary() {
      try {
        // 1. 呼叫 API
        const response = await fetch(
          `/api/documents/${documentId}/pages/${pageNumber}/summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId, pageNumber }),
          },
        );

        // 2. 解析回應 — 跟 fetch 在同一個函式裡！
        const data = await response.json();

        // 3. 根據結果更新 state
        if (!response.ok) {
          setError(data.error || "Failed to fetch summary");
          setSummary("");
        } else {
          setSummary(data.summary);
        }
      } catch (err) {
        setError("網路錯誤，無法取得摘要");
        setSummary("");
      }
    }

    fetchSummary();
  }, [documentId, pageNumber]);

  return (
    <div className="page-summary">
      {error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="summary">{summary}</div>
      )}
    </div>
  );
}
