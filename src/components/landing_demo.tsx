"use client";

import { useEffect, useState } from "react";
import { ScanSearch, Sparkles } from "lucide-react";

/**
 * Self-playing product demo for the landing page. Simulates the real reader:
 * a lecture slide on the left, a streamed page summary + region-select Q&A on
 * the right, then flips to the next page and loops. Pure CSS/React — no video.
 * Respects prefers-reduced-motion by rendering the finished state instead.
 */

type DemoPage = {
  pageLabel: string;
  slideTitle: string;
  chart: "relu" | "network";
  summary: string;
  question: string;
  questionChip: string | null;
  answer: string;
};

const DOC_NAME = "機器學習導論.pdf";

const PAGES: DemoPage[] = [
  {
    pageLabel: "第 3 頁 / 共 24 頁",
    slideTitle: "3.2 激活函數：ReLU",
    chart: "relu",
    summary:
      "ReLU 將負值歸零、正值原樣輸出，計算快且能緩解梯度消失；缺點是可能出現「神經元死亡」。",
    question: "神經元死亡是什麼意思?",
    questionChip: null,
    answer:
      "當輸入長期為負，輸出與梯度都是 0，權重不再更新，這顆神經元就「死」了。可改用 Leaky ReLU 緩解。",
  },
  {
    pageLabel: "第 4 頁 / 共 24 頁",
    slideTitle: "3.3 反向傳播 Backpropagation",
    chart: "network",
    summary:
      "誤差從輸出層往回傳，以鏈鎖律逐層計算梯度；學習率決定每一步權重修正的幅度。",
    question: "隱藏層的梯度怎麼算?",
    questionChip: "已圈選圖表區域",
    answer:
      "把下一層傳回的梯度，乘上本層激活函數的導數與輸入值——就是鏈鎖律的逐層套用。",
  },
];

const TYPE_MS = 30;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function LandingDemo() {
  const [pageIdx, setPageIdx] = useState(0);
  const [summaryText, setSummaryText] = useState("");
  const [summaryTyping, setSummaryTyping] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [answerTyping, setAnswerTyping] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    async function typeInto(
      text: string,
      set: (value: string) => void,
      setTyping: (value: boolean) => void,
    ) {
      setTyping(true);
      for (let i = 1; i <= text.length && !cancelled; i++) {
        set(text.slice(0, i));
        await sleep(TYPE_MS);
      }
      setTyping(false);
    }

    async function run() {
      // Defer the first state write so it never happens synchronously in the
      // effect body (strict react-hooks rule).
      await sleep(reduced ? 0 : 500);
      if (cancelled) return;

      if (reduced) {
        const page = PAGES[0];
        setSummaryText(page.summary);
        setShowQuestion(true);
        setAnswerText(page.answer);
        return;
      }

      let index = 0;
      while (!cancelled) {
        const page = PAGES[index % PAGES.length];
        setPageIdx(index % PAGES.length);
        setFading(false);
        setSummaryText("");
        setShowQuestion(false);
        setAnswerText("");

        await sleep(750); // skeleton beat
        if (cancelled) return;
        await typeInto(page.summary, setSummaryText, setSummaryTyping);
        await sleep(850);
        if (cancelled) return;
        setShowQuestion(true);
        await sleep(1050);
        if (cancelled) return;
        await typeInto(page.answer, setAnswerText, setAnswerTyping);
        await sleep(2600);
        if (cancelled) return;
        setFading(true);
        await sleep(420);
        index++;
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const page = PAGES[pageIdx];
  const summaryEmpty = summaryText.length === 0;

  return (
    <div
      className="demo-window overflow-hidden rounded-xl border text-left"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-lg)",
      }}
      aria-label="產品操作示範動畫"
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 border-b px-3.5 py-2.5"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <span className="flex gap-1.5" aria-hidden>
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 truncate text-xs font-medium text-muted">
          {DOC_NAME}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-faint">
          {page.pageLabel}
        </span>
      </div>

      <div
        className="grid grid-cols-[1.15fr_1fr]"
        style={{ opacity: fading ? 0 : 1, transition: "opacity 0.4s ease" }}
      >
        {/* Left: the lecture slide */}
        <div
          className="border-r p-3.5"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div
            className="flex h-full flex-col rounded-md border bg-white p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-[11px] font-bold text-gray-800">
              {page.slideTitle}
            </p>
            <div className="mt-2 space-y-1.5" aria-hidden>
              <div className="h-1.5 w-11/12 rounded bg-gray-200" />
              <div className="h-1.5 w-4/5 rounded bg-gray-200" />
              <div className="h-1.5 w-3/5 rounded bg-gray-200" />
            </div>
            <div className="mt-3 flex-1" aria-hidden>
              {page.chart === "relu" ? <ReluChart /> : <NetworkChart />}
            </div>
          </div>
        </div>

        {/* Right: summary + Q&A */}
        <div className="flex min-h-[19rem] flex-col gap-2.5 p-3.5">
          {/* Summary card */}
          <div
            className="rounded-lg border p-2.5"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
              <Sparkles
                className="h-3 w-3"
                style={{ color: "var(--accent)" }}
              />
              本頁摘要
            </p>
            {summaryEmpty ? (
              <div className="space-y-1.5">
                <div className="skeleton h-2 w-full" />
                <div className="skeleton h-2 w-5/6" />
                <div className="skeleton h-2 w-2/3" />
              </div>
            ) : (
              <p
                className={`text-xs leading-relaxed ${summaryTyping ? "stream-caret" : ""}`}
              >
                {summaryText}
              </p>
            )}
          </div>

          {/* Question bubble */}
          {showQuestion && (
            <div className="demo-pop flex justify-end">
              <div
                className="max-w-[88%] rounded-xl rounded-br-sm px-2.5 py-1.5"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                {page.questionChip && (
                  <p className="mb-1 flex items-center gap-1 text-[10px] opacity-85">
                    <ScanSearch className="h-2.5 w-2.5" />
                    {page.questionChip}
                  </p>
                )}
                <p className="text-xs">{page.question}</p>
              </div>
            </div>
          )}

          {/* Answer bubble */}
          {answerText && (
            <div className="flex justify-start">
              <div
                className="max-w-[92%] rounded-xl rounded-bl-sm border px-2.5 py-1.5"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <p
                  className={`text-xs leading-relaxed ${answerTyping ? "stream-caret" : ""}`}
                >
                  {answerText}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReluChart() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full">
      <line x1="16" y1="92" x2="192" y2="92" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="16" y2="92" stroke="#d1d5db" strokeWidth="1.5" />
      <polyline
        points="16,92 104,92 188,16"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <text x="150" y="106" fontSize="9" fill="#9ca3af">
        ReLU(x)
      </text>
    </svg>
  );
}

function NetworkChart() {
  const layers = [
    { x: 30, nodes: [30, 60, 90] },
    { x: 100, nodes: [20, 45, 70, 95] },
    { x: 170, nodes: [42, 72] },
  ];
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full">
      {layers.slice(0, -1).map((layer, i) =>
        layer.nodes.map((y1) =>
          layers[i + 1].nodes.map((y2) => (
            <line
              key={`${i}-${y1}-${y2}`}
              x1={layer.x}
              y1={y1}
              x2={layers[i + 1].x}
              y2={y2}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )),
        ),
      )}
      <line x1="100" y1="45" x2="170" y2="42" stroke="var(--accent)" strokeWidth="1.8" />
      <line x1="30" y1="60" x2="100" y2="45" stroke="var(--accent)" strokeWidth="1.8" />
      {layers.map((layer) =>
        layer.nodes.map((y) => (
          <circle
            key={`${layer.x}-${y}`}
            cx={layer.x}
            cy={y}
            r="7"
            fill="white"
            stroke="#9ca3af"
            strokeWidth="1.5"
          />
        )),
      )}
    </svg>
  );
}
