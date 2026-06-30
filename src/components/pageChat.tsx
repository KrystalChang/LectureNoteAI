"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PromptPreferences,
  buildQAPrompt,
  buildSummaryPrompt,
} from "@/lib/prompt_preferences";

type PageChatProps = {
  documentId: string;
  pageNumber: number;
  selectedText: string;
  promptPreferences: PromptPreferences;
};

type QAEntry = {
  id: string;
  pageNumber: number;
  selectedText: string;
  question: string;
  answer: string;
  createdAt: string;
};

export default function PageChat({
  documentId,
  pageNumber,
  selectedText,
  promptPreferences,
}: PageChatProps) {
  const [summary, setSummary] = useState("");
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  const [summaryLoading, setSummaryLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const summaryPrompt = buildSummaryPrompt(promptPreferences);
  const qaPrompt = buildQAPrompt(promptPreferences);

  useEffect(() => {
    let ignore = false;

    async function fetchSummary() {
      setSummaryLoading(true);
      setSummary("");
      setError("");

      try {
        const response = await fetch(
          `/api/documents/${documentId}/pages/${pageNumber}/summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId,
              pageNumber,
              systemPrompt: summaryPrompt.systemPrompt,
              userPrompt: summaryPrompt.userPrompt,
            }),
          },
        );

        const data = await response.json();

        if (ignore) return;

        if (!response.ok) {
          setError(data.error || "Failed to fetch summary");
          return;
        }

        setSummary(data.summary);
      } catch {
        if (!ignore) setError("網路錯誤，無法取得摘要");
      } finally {
        if (!ignore) setSummaryLoading(false);
      }
    }

    async function fetchQAHistory() {
      setHistoryLoading(true);
      setQaHistory([]);
      setError("");

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
        if (!ignore) setError("網路錯誤，無法取得問答紀錄");
      } finally {
        if (!ignore) setHistoryLoading(false);
      }
    }

    fetchSummary();
    fetchQAHistory();

    return () => {
      ignore = true;
    };
  }, [
    documentId,
    pageNumber,
    summaryPrompt.systemPrompt,
    summaryPrompt.userPrompt,
  ]);

  useEffect(() => {
    const trimmedSelectedText = selectedText.trim();
    if (!trimmedSelectedText) return;

    const timer = window.setTimeout(() => {
      setPrompt(trimmedSelectedText);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedText]);

  async function handleSubmit() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch(`/api/documents/${documentId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          question: trimmedPrompt,
          selectedText,
          systemPrompt: qaPrompt.systemPrompt,
          userPrompt: qaPrompt.userPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch answer");
        return;
      }

      setQaHistory((current) => [...current, data.qaEntry]);
      setPrompt("");
    } catch {
      setError("網路錯誤，無法取得回答");
    } finally {
      setSending(false);
    }
  }

  async function handleCopyAnswer(entryId: string, answer: string) {
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedId(entryId);

      window.setTimeout(() => {
        setCopiedId((currentId) => (currentId === entryId ? null : currentId));
      }, 2000);
    } catch {
      setError("無法複製回答，請再試一次");
    }
  }

  return (
    <div className="flex h-full flex-col text-sm">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <section className="rounded border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 font-semibold text-gray-900">Summary</p>

          {summaryLoading ? (
            <p className="text-gray-500">Loading summary...</p>
          ) : (
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary}
              </ReactMarkdown>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <p className="font-semibold text-gray-900">Conversation</p>

          {historyLoading && (
            <p className="text-gray-500">Loading history...</p>
          )}

          {!historyLoading && qaHistory.length === 0 && (
            <p className="text-gray-500">No questions yet.</p>
          )}

          {qaHistory.map((entry) => (
            <article
              key={entry.id}
              className="space-y-3 rounded border border-gray-200 p-3"
            >
              <div>
                <p className="mb-1 font-medium text-gray-900">You</p>
                <p className="whitespace-pre-wrap text-gray-700">
                  {entry.question}
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-900">AI</p>

                  <button
                    type="button"
                    onClick={() => handleCopyAnswer(entry.id, entry.answer)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {copiedId === entry.id ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {entry.answer}
                  </ReactMarkdown>
                </div>
              </div>
            </article>
          ))}
        </section>

        {error && <p className="text-red-600">{error}</p>}
      </div>

      <div className="border-t border-gray-200 pt-3">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="選取 PDF 文字後會自動帶入，也可以直接輸入問題..."
          className="min-h-24 w-full rounded border border-gray-300 p-3 outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending || !prompt.trim()}
          className="mt-2 rounded bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
