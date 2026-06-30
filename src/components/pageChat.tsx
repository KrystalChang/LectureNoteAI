"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, ImageOff, Quote, Send, Sparkles, X } from "lucide-react";
import {
  PromptPreferences,
  buildQAPrompt,
  buildSummaryPrompt,
} from "@/lib/prompt_preferences";
import { readNdjsonStream } from "@/lib/stream_client";
import { capturePageImage } from "@/lib/capture";
import Markdown from "./markdown";

type PageChatProps = {
  documentId: string;
  pageNumber: number;
  selectedText: string;
  promptPreferences: PromptPreferences;
  pendingImage: string | null;
  onPendingImageConsumed?: () => void;
  onClearSelectedText?: () => void;
  onSummaryDone?: () => void;
};

type QAEntry = {
  id: string;
  pageNumber: number;
  selectedText: string;
  question: string;
  answer: string;
  createdAt: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PageChat({
  documentId,
  pageNumber,
  selectedText,
  promptPreferences,
  pendingImage,
  onPendingImageConsumed,
  onClearSelectedText,
  onSummaryDone,
}: PageChatProps) {
  const [summary, setSummary] = useState("");
  const [summaryStreaming, setSummaryStreaming] = useState(true);
  const [summaryImageBased, setSummaryImageBased] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingQuestion, setStreamingQuestion] = useState("");
  const [streamingSelectedText, setStreamingSelectedText] = useState("");
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const summaryPrompt = buildSummaryPrompt(promptPreferences);
  const qaPrompt = buildQAPrompt(promptPreferences);
  const onSummaryDoneRef = useRef(onSummaryDone);

  // Keep the latest callback in a ref without touching it during render.
  useEffect(() => {
    onSummaryDoneRef.current = onSummaryDone;
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // ---- Summary (streamed) + history ----
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let active = true;
    const safe = (fn: () => void) => {
      if (active && !signal.aborted) fn();
    };

    async function captureWithRetry(): Promise<string | null> {
      for (let i = 0; i < 8 && !signal.aborted; i++) {
        const dataUrl = capturePageImage(pageNumber);
        if (dataUrl) return dataUrl;
        await sleep(250);
      }
      return null;
    }

    async function runSummary(image?: string) {
      const response = await fetch(
        `/api/documents/${documentId}/pages/${pageNumber}/summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageNumber,
            systemPrompt: summaryPrompt.systemPrompt,
            userPrompt: summaryPrompt.userPrompt,
            stream: true,
            image,
          }),
          signal,
        },
      );

      let needsImage = false;
      await readNdjsonStream(
        response,
        (msg) => {
          switch (msg.type) {
            case "meta":
              safe(() => setSummaryImageBased(Boolean(msg.imageBased)));
              break;
            case "delta":
              safe(() => setSummary((s) => s + String(msg.text ?? "")));
              break;
            case "needsImage":
              needsImage = true;
              break;
            case "error":
              safe(() => setSummaryError(String(msg.error ?? "摘要產生失敗")));
              break;
            default:
              break;
          }
        },
        signal,
      );

      if (needsImage && !image) {
        safe(() => setSummaryImageBased(true));
        const dataUrl = await captureWithRetry();
        if (signal.aborted) return;
        if (dataUrl) {
          await runSummary(dataUrl);
          return;
        }
        safe(() =>
          setSummaryError("這一頁以圖片為主，但暫時無法擷取頁面圖片，請稍候再試。"),
        );
      }
    }

    async function fetchHistory() {
      try {
        const response = await fetch(
          `/api/documents/${documentId}/qa?pageNumber=${pageNumber}`,
          { signal },
        );
        const data = await response.json();
        if (response.ok) safe(() => setQaHistory(data.qaEntries));
      } catch {
        /* ignore */
      } finally {
        safe(() => setHistoryLoading(false));
      }
    }

    // No state reset needed here: the parent remounts this component (via its
    // `key`) whenever the page or summary preferences change, so state starts
    // fresh from the useState initialisers above.
    (async () => {
      try {
        await runSummary();
      } catch {
        safe(() => {
          if (!signal.aborted) setSummaryError("網路錯誤，無法取得摘要");
        });
      } finally {
        safe(() => setSummaryStreaming(false));
        if (!signal.aborted) onSummaryDoneRef.current?.();
      }
    })();
    fetchHistory();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    documentId,
    pageNumber,
    summaryPrompt.systemPrompt,
    summaryPrompt.userPrompt,
  ]);

  // Keep the conversation scrolled to the latest message.
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [qaHistory.length, streamingAnswer]);

  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || sending) return;

    const imageToSend = pendingImage ?? undefined;
    const attachedText = selectedText.trim();
    setSending(true);
    setError("");
    setStreamingQuestion(trimmedPrompt);
    setStreamingSelectedText(attachedText);
    setStreamingAnswer("");

    try {
      const response = await fetch(`/api/documents/${documentId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber,
          question: trimmedPrompt,
          selectedText: attachedText,
          systemPrompt: qaPrompt.systemPrompt,
          userPrompt: qaPrompt.userPrompt,
          image: imageToSend,
          stream: true,
        }),
      });

      let saved: QAEntry | null = null;
      await readNdjsonStream(response, (msg) => {
        if (msg.type === "delta") {
          setStreamingAnswer((a) => a + String(msg.text ?? ""));
        } else if (msg.type === "done") {
          saved = msg.qaEntry as QAEntry;
        } else if (msg.type === "error") {
          setError(String(msg.error ?? "回答失敗"));
        }
      });

      if (saved) setQaHistory((current) => [...current, saved as QAEntry]);
      setPrompt("");
      if (imageToSend) onPendingImageConsumed?.();
      if (attachedText) onClearSelectedText?.();
    } catch {
      setError("網路錯誤，無法取得回答");
    } finally {
      setSending(false);
      setStreamingQuestion("");
      setStreamingSelectedText("");
      setStreamingAnswer("");
    }
  }, [
    prompt,
    sending,
    pendingImage,
    selectedText,
    documentId,
    pageNumber,
    qaPrompt.systemPrompt,
    qaPrompt.userPrompt,
    onPendingImageConsumed,
    onClearSelectedText,
  ]);

  const handleCopy = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(
        () => setCopiedId((current) => (current === id ? null : current)),
        2000,
      );
    } catch {
      setError("無法複製內容");
    }
  }, []);

  const summaryEmpty = !summary && !summaryError;
  const trimmedSelectedText = selectedText.trim();

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollAreaRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Summary */}
        <section className="card p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <p className="text-sm font-semibold">本頁摘要</p>
            {summaryImageBased && <span className="chip">圖片摘要</span>}
            {summaryStreaming && !summaryEmpty && (
              <span className="chip">產生中…</span>
            )}
            {!summaryStreaming && summary && (
              <button
                type="button"
                onClick={() => void handleCopy("summary", summary)}
                className="btn btn-subtle ml-auto h-7 px-2 text-xs"
                title="複製摘要"
              >
                {copiedId === "summary" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedId === "summary" ? "已複製" : "複製"}
              </button>
            )}
          </div>

          {summaryError ? (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {summaryError}
            </p>
          ) : summaryEmpty && summaryStreaming ? (
            <div className="space-y-2">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ) : (
            <Markdown className={summaryStreaming ? "stream-caret" : ""}>
              {summary}
            </Markdown>
          )}
        </section>

        {/* Conversation */}
        <section className="space-y-3">
          <p className="text-sm font-semibold">問答</p>

          {historyLoading && <p className="text-sm text-muted">載入紀錄中…</p>}
          {!historyLoading && qaHistory.length === 0 && !streamingQuestion && (
            <p className="text-sm text-muted">
              還沒有提問。選取講義文字、或用「圈選提問」框選圖片來開始。
            </p>
          )}

          {qaHistory.map((entry) => (
            <QAExchange
              key={entry.id}
              question={entry.question}
              selectedText={entry.selectedText}
              answer={entry.answer}
              copied={copiedId === entry.id}
              onCopy={() => void handleCopy(entry.id, entry.answer)}
            />
          ))}

          {streamingQuestion && (
            <QAExchange
              question={streamingQuestion}
              selectedText={streamingSelectedText}
              answer={streamingAnswer}
              streaming
            />
          )}
        </section>

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>

      {/* Composer */}
      <div
        className="shrink-0 border-t px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Selected-text reference chip (shown above the input, not pasted in) */}
        {trimmedSelectedText && (
          <div
            className="mb-2 flex items-start gap-2 rounded-lg border px-2.5 py-2"
            style={{
              borderColor: "var(--accent)",
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            }}
          >
            <Quote
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--accent)" }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--accent)" }}
              >
                已選取文字
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                {trimmedSelectedText}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-subtle h-6 w-6 shrink-0 p-0"
              onClick={() => onClearSelectedText?.()}
              title="移除選取文字"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Pending image reference chip */}
        {pendingImage && (
          <div
            className="mb-2 flex items-center gap-3 rounded-lg border p-2"
            style={{ borderColor: "var(--accent)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt="圈選的圖片區域"
              className="h-12 w-16 rounded object-cover"
            />
            <span className="flex-1 text-xs text-muted">
              已圈選圖片，提問將針對此區域
            </span>
            <button
              type="button"
              className="btn btn-subtle h-7 px-2"
              onClick={() => onPendingImageConsumed?.()}
              title="移除圈選圖片"
            >
              <ImageOff className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              // Enter submits; Shift+Enter makes a newline. isComposing guards
              // against submitting mid-IME (e.g. choosing a Chinese candidate).
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="輸入問題，按 Enter 送出（Shift + Enter 換行）…"
            className="textarea max-h-40 min-h-11 flex-1 resize-none"
            rows={1}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={sending || !prompt.trim()}
            className="btn btn-primary h-11 shrink-0"
            title="送出"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{sending ? "回答中…" : "送出"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * One Q&A turn rendered as a chat exchange: the user's question as an
 * accent bubble on the right, the AI answer as a surface bubble on the left.
 */
function QAExchange({
  question,
  selectedText,
  answer,
  copied = false,
  streaming = false,
  onCopy,
}: {
  question: string;
  selectedText: string;
  answer: string;
  copied?: boolean;
  streaming?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* User question */}
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {selectedText && (
            <p
              className="mb-1.5 border-l-2 pl-2 text-xs opacity-85"
              style={{ borderColor: "var(--accent-fg)" }}
            >
              {selectedText}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm">{question}</p>
        </div>
      </div>

      {/* AI answer */}
      <div className="flex justify-start">
        <div
          className="max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <Markdown className={streaming ? "stream-caret" : ""}>{answer}</Markdown>
          {!streaming && onCopy && (
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={onCopy}
                className="btn btn-subtle h-7 px-2 text-xs"
                title="複製回答"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "已複製" : "複製"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
