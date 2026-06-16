"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PageQAProps = {
  documentId: string;
  pageNumber: number;
  selectedText: string;
};

type QAEntry = {
  id: string;
  pageNumber: number;
  selectedText: string;
  question: string;
  answer: string;
  createdAt: string;
};

export default function PageQA({
  documentId,
  pageNumber,
  selectedText,
}: PageQAProps) {
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchQAHistory() {
      setHistoryLoading(true);
      setError("");
      setQuestion("");
      setQaHistory([]);

      try {
        const response = await fetch(
          `/api/documents/${documentId}/qa?pageNumber=${pageNumber}`,
        );
        const data = await response.json();

        if (ignore) return;

        if (!response.ok) {
          setError(data.error || "Failed to fetch QA history");
          return;
        }

        setQaHistory(data.qaEntries);
      } catch {
        if (!ignore) setError("Failed to fetch QA history");
      } finally {
        if (!ignore) setHistoryLoading(false);
      }
    }

    fetchQAHistory();

    return () => {
      ignore = true;
    };
  }, [documentId, pageNumber]);

  async function handleSubmit() {
    if (!selectedText.trim() || !question.trim()) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/documents/${documentId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          question,
          selectedText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to fetch answer");
        return;
      }

      setQaHistory((current) => [...current, data.qaEntry]);
      setQuestion("");
    } catch {
      setError("網路錯誤，無法取得回答");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <section className="space-y-2">
        <p className="font-medium text-gray-900">Selected text</p>
        <p className="rounded border border-gray-200 bg-gray-50 p-3 text-gray-700">
          {selectedText || "Select text from the PDF first."}
        </p>
      </section>

      <section className="space-y-2">
        <label className="font-medium text-gray-900" htmlFor="qa-question">
          Question
        </label>

        <textarea
          id="qa-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-h-24 w-full rounded border border-gray-300 p-3 outline-none focus:border-blue-500"
          placeholder="Ask a question about the selected text..."
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !selectedText.trim() || !question.trim()}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {loading ? "Answering..." : "Ask AI"}
        </button>
      </section>

      {error && <p className="text-red-600">{error}</p>}

      <section className="space-y-3">
        <p className="font-medium text-gray-900">History</p>

        {historyLoading && <p>Loading history...</p>}

        {!historyLoading && qaHistory.length === 0 && <p>No questions yet.</p>}

        {qaHistory.map((entry) => (
          <article
            key={entry.id}
            className="space-y-2 rounded border border-gray-200 p-3"
          >
            <p className="font-medium text-gray-900">Q: {entry.question}</p>
            <p className="font-medium text-gray-900">
              Selected Text: {entry.selectedText}
            </p>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {entry.answer}
              </ReactMarkdown>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
