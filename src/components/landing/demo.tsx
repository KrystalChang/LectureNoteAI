"use client";

import { useEffect, useState } from "react";
import { ScanSearch, Sparkles } from "lucide-react";

/**
 * Self-playing product demo for the landing page. Simulates the real reader
 * across three different subjects (ML → economics → statistics): a lecture
 * slide on the left, a streamed page summary + Q&A on the right. The
 * economics page demos region-select — a dashed box draws over the chart
 * before the question pops. Pure CSS/React — no video.
 * Respects prefers-reduced-motion by rendering a finished state instead.
 */

type DemoPage = {
  docName: string;
  pageLabel: string;
  slideTitle: string;
  chart: "relu" | "supply" | "normal";
  summary: string;
  question: string;
  /** true → play the region-select animation before asking */
  selectRegion: boolean;
  answer: string;
};

const PAGES: DemoPage[] = [
  {
    docName: "機器學習導論.pdf",
    pageLabel: "第 3 頁 / 共 24 頁",
    slideTitle: "3.2 激活函數：ReLU",
    chart: "relu",
    summary:
      "ReLU 將負值歸零、正值原樣輸出，計算快且能緩解梯度消失；缺點是可能出現「神經元死亡」。",
    question: "神經元死亡是什麼意思?",
    selectRegion: false,
    answer:
      "當輸入長期為負，輸出與梯度都是 0，權重不再更新，這顆神經元就「死」了。可改用 Leaky ReLU 緩解。",
  },
  {
    docName: "個體經濟學.pdf",
    pageLabel: "第 12 頁 / 共 36 頁",
    slideTitle: "2.4 供給與需求：均衡價格",
    chart: "supply",
    summary:
      "供給曲線與需求曲線的交點決定均衡價格與均衡數量；價格高於均衡會過剩、低於均衡會短缺。",
    question: "為什麼交點就是均衡價格?",
    selectRegion: true,
    answer:
      "在交點上供給量恰好等於需求量，市場沒有過剩也沒有短缺，價格便沒有繼續變動的壓力。",
  },
  {
    docName: "統計學.pdf",
    pageLabel: "第 8 頁 / 共 30 頁",
    slideTitle: "5.1 常態分佈與 68–95–99.7 法則",
    chart: "normal",
    summary:
      "常態分佈以平均值為中心對稱；±1σ 內約 68%、±2σ 約 95%、±3σ 約 99.7% 的資料。",
    question: "±2σ 涵蓋 95% 是怎麼來的?",
    selectRegion: false,
    answer:
      "這是常態分佈密度函數積分的結果：從 μ−2σ 積到 μ+2σ 的面積約為 0.954，屬於分佈本身的性質。",
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
  const [showSelection, setShowSelection] = useState(false);
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
        setShowSelection(false);
        setShowQuestion(false);
        setAnswerText("");

        await sleep(750); // skeleton beat
        if (cancelled) return;
        await typeInto(page.summary, setSummaryText, setSummaryTyping);
        await sleep(700);
        if (cancelled) return;

        // Region-select beat: dashed box draws over the chart first.
        if (page.selectRegion) {
          setShowSelection(true);
          await sleep(1100);
          if (cancelled) return;
        }

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
      aria-label="產品操作示範動畫：三種科目的講義輪流展示摘要與圈選提問"
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
          {page.docName}
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
            <div className="relative mt-3 flex-1" aria-hidden>
              {page.chart === "relu" && <ReluChart />}
              {page.chart === "supply" && <SupplyDemandChart />}
              {page.chart === "normal" && <NormalChart />}

              {/* Region-select overlay: dashed box + Ask AI pill */}
              {showSelection && page.selectRegion && (
                <span
                  className="demo-select absolute rounded-md"
                  style={{
                    left: "30%",
                    right: "26%",
                    top: "16%",
                    bottom: "30%",
                    border: "1.5px dashed var(--accent)",
                    background:
                      "color-mix(in srgb, var(--accent) 10%, transparent)",
                  }}
                >
                  <span
                    className="demo-pop absolute -bottom-3 -right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold shadow-md"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-fg)",
                      animationDelay: "0.45s",
                    }}
                  >
                    <ScanSearch className="h-2.5 w-2.5" /> Ask AI
                  </span>
                </span>
              )}
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
                {page.selectRegion && (
                  <p className="mb-1 flex items-center gap-1 text-[10px] opacity-85">
                    <ScanSearch className="h-2.5 w-2.5" />
                    已圈選圖表區域
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

      {/* Subject dots — shows the demo cycles through different topics */}
      <div
        className="flex items-center justify-center gap-1.5 border-t py-2"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        aria-hidden
      >
        {PAGES.map((p, i) => (
          <i
            key={p.docName}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === pageIdx ? "1rem" : "0.375rem",
              background:
                i === pageIdx ? "var(--accent)" : "var(--border-strong)",
            }}
          />
        ))}
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

function SupplyDemandChart() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full">
      <line x1="16" y1="92" x2="192" y2="92" stroke="#d1d5db" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="16" y2="92" stroke="#d1d5db" strokeWidth="1.5" />
      {/* demand: high → low */}
      <line
        x1="30"
        y1="18"
        x2="182"
        y2="84"
        stroke="#9ca3af"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* supply: low → high */}
      <line
        x1="30"
        y1="84"
        x2="182"
        y2="18"
        stroke="#9ca3af"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* equilibrium point + guides */}
      <line
        x1="106"
        y1="51"
        x2="106"
        y2="92"
        stroke="#d1d5db"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1="16"
        y1="51"
        x2="106"
        y2="51"
        stroke="#d1d5db"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <circle cx="106" cy="51" r="4.5" fill="var(--accent)" />
      <text x="184" y="90" fontSize="9" fill="#9ca3af">D</text>
      <text x="184" y="16" fontSize="9" fill="#9ca3af">S</text>
      <text x="4" y="54" fontSize="9" fill="#9ca3af">P*</text>
    </svg>
  );
}

function NormalChart() {
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full">
      <line x1="12" y1="92" x2="192" y2="92" stroke="#d1d5db" strokeWidth="1.5" />
      {/* bell curve */}
      <path
        d="M 16 90 C 58 90 68 14 100 14 C 132 14 142 90 184 90"
        fill="color-mix(in srgb, var(--accent) 10%, transparent)"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* ±σ markers */}
      <line x1="68" y1="40" x2="68" y2="92" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="132" y1="40" x2="132" y2="92" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 3" />
      <text x="97" y="104" fontSize="9" fill="#9ca3af">μ</text>
      <text x="60" y="104" fontSize="8" fill="#9ca3af">−σ</text>
      <text x="126" y="104" fontSize="8" fill="#9ca3af">+σ</text>
    </svg>
  );
}
