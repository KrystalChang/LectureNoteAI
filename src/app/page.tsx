import type { Metadata } from "next";
import {
  Check,
  Download,
  MessageSquareText,
  Moon,
  PenLine,
  ScanSearch,
  Sigma,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { signIn } from "@/auth";
import LandingDemo from "@/components/landing/demo";
import {
  ArtExport,
  ArtNotes,
  ArtRegionAsk,
  ArtSelectAsk,
  ArtStreamSummary,
  StepExportArt,
  StepReadArt,
  StepUploadArt,
} from "@/components/landing/feature_art";
import ScrollFx from "@/components/landing/scroll_fx";
import ThemeControls from "@/components/theme_controls";

export const metadata: Metadata = {
  title: "LectureNoteAI — 讓 AI 陪你一頁一頁讀懂講義",
  description:
    "上傳 PDF 講義，AI 逐頁串流摘要、圈選圖表提問、筆記匯出 PDF / Word / Markdown。用 Google 帳號免費開始。",
  alternates: {
    canonical: "/",
  },
};

async function startWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/dashboard" });
}

export default function LandingPage() {
  return (
    <main className="landing min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <style>{LANDING_CSS}</style>
      <noscript>
        {/* If JS never loads, show everything instead of leaving it hidden. */}
        <style>{`.landing [data-reveal]{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      <ScrollFx />

      {/* ---- Nav ---- */}
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            aria-hidden
          >
            L
          </span>
          <span className="text-[15px] font-semibold">LectureNoteAI</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeControls />
          <form action={startWithGoogle}>
            <button type="submit" className="btn btn-ghost h-9">
              登入
            </button>
          </form>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="hero-ruled">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:pt-16">
          <div className="reveal">
            <p
              className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: "var(--accent)" }}
              />
              為讀講義而生的 AI 閱讀器
            </p>
            <h1 className="text-4xl font-bold leading-[1.2] tracking-tight sm:text-[2.75rem]">
              厚厚的講義，
              <br />
              讓 AI 陪你<span className="marker">一頁一頁</span>讀懂
            </h1>
            <p
              className="mt-5 max-w-md text-[15px] leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              上傳 PDF，每一頁的摘要即時串流出現；圖表看不懂就圈起來直接問。
              讀完的筆記，一鍵匯出成 PDF、Word 或 Markdown。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <form action={startWithGoogle}>
                <button
                  type="submit"
                  className="btn btn-primary h-11 px-5 text-[15px]"
                >
                  <GoogleChip />
                  使用 Google 免費開始
                </button>
              </form>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                登入即註冊，10 秒完成
              </span>
            </div>
          </div>

          <div className="reveal reveal-2">
            <LandingDemo />
          </div>
        </div>
      </section>

      {/* ---- How it works: 3 steps, each with a visual ---- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div data-reveal className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            三步驟，把講義變成<span className="marker">你的筆記</span>
          </h2>
          <p className="mt-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
            不用先讀說明書 — 拖一份 PDF 進來，剩下的邊用邊懂。
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              data-reveal
              style={{ transitionDelay: `${index * 120}ms` }}
              className="card flex flex-col p-5"
            >
              {step.art}
              <div className="mt-4 flex items-baseline gap-2">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums"
                  style={{
                    background:
                      "color-mix(in srgb, var(--accent) 14%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  {index + 1}
                </span>
                <h3 className="text-[15px] font-semibold">{step.title}</h3>
              </div>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Features: alternating copy + visual rows ---- */}
      <section
        className="border-y"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto w-full max-w-5xl px-5 py-16">
          <div data-reveal className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              讀得快，也讀得深
            </h2>
            <p className="mt-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
              從第一頁到匯出筆記，每個環節都有 AI 搭一把手。
            </p>
          </div>

          <div className="mt-6 flex flex-col">
            {FEATURE_ROWS.map((feature, index) => {
              const artFirst = index % 2 === 1;
              return (
                <div
                  key={feature.title}
                  className="grid items-center gap-8 py-10 lg:grid-cols-2 lg:gap-14"
                >
                  {/* Copy */}
                  <div data-reveal={artFirst ? "right" : "left"}>
                    <span
                      className="inline-grid h-9 w-9 place-items-center rounded-lg"
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent) 14%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {feature.icon}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {feature.body}
                    </p>
                    <ul className="mt-3.5 space-y-1.5">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            style={{ color: "var(--accent)" }}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Visual */}
                  <div
                    data-reveal={artFirst ? "left" : "right"}
                    className={artFirst ? "lg:order-first" : ""}
                  >
                    {feature.art}
                  </div>
                </div>
              );
            })}
          </div>

          {/* And-there's-more strip */}
          <div
            data-reveal
            className="mt-4 flex flex-wrap items-center justify-center gap-2.5 border-t pt-8"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              還有：
            </span>
            {EXTRAS.map((extra) => (
              <span key={extra.label} className="chip !py-1.5">
                {extra.icon}
                {extra.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 text-center">
        <div data-reveal>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            下一份講義，<span className="marker">別再自己硬讀</span>
          </h2>
          <form action={startWithGoogle} className="mt-7 inline-block">
            <button
              type="submit"
              className="btn btn-primary h-11 px-6 text-[15px]"
            >
              <GoogleChip />
              使用 Google 免費開始
            </button>
          </form>
        </div>
      </section>

      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
      >
        LectureNoteAI — 逐頁讀懂你的講義 · {new Date().getFullYear()}
      </footer>
    </main>
  );
}

const STEPS = [
  {
    title: "上傳 PDF 講義",
    body: "拖進來就好。系統逐頁抽取內容，以圖片為主的頁面也認得出來。",
    art: <StepUploadArt />,
  },
  {
    title: "邊讀邊問",
    body: "目前頁的摘要即時串流，其他頁在背景補齊；選文字或圈圖表，直接對這一頁提問。",
    art: <StepReadArt />,
  },
  {
    title: "匯出成筆記",
    body: "每頁摘要加上你的筆記，一鍵匯出 PDF、Word 或 Markdown，直接拿去複習。",
    art: <StepExportArt />,
  },
];

const FEATURE_ROWS = [
  {
    icon: <Sparkles className="h-4.5 w-4.5" />,
    title: "逐頁串流摘要",
    body: "翻到哪頁、摘要就跟到哪頁。第一個字約一秒內出現，不用盯著轉圈圈等整份跑完。",
    points: [
      "目前頁優先，其他頁在背景補齊",
      "看過的頁面存進資料庫，重看即開即現",
      "以圖片為主的頁面自動改用視覺理解",
    ],
    art: <ArtStreamSummary />,
  },
  {
    icon: <MessageSquareText className="h-4.5 w-4.5" />,
    title: "選字提問",
    body: "讀到看不懂的句子，反白它、點 Ask AI，就地追問。AI 會帶著整頁脈絡回答，不是斷章取義。",
    points: [
      "以選取文字 + 整頁內容為上下文",
      "答案即時串流，像和助教對話",
      "問答跟著頁碼保存，複習時還在",
    ],
    art: <ArtSelectAsk />,
  },
  {
    icon: <ScanSearch className="h-4.5 w-4.5" />,
    title: "圈選圖表提問",
    body: "公式、圖表、流程圖 — 文字選不到的，直接框起來問。AI 看著你圈的那塊圖回答。",
    points: [
      "拖一個框就完成圈選，不用截圖再上傳",
      "圖表、手寫掃描、投影片截圖都適用",
      "與選字提問共用同一個問答面板",
    ],
    art: <ArtRegionAsk />,
  },
  {
    icon: <PenLine className="h-4.5 w-4.5" />,
    title: "每頁筆記",
    body: "讀到重點隨手記，筆記跟著頁碼走。AI 摘要負責客觀重點，筆記欄留給你自己的理解。",
    points: [
      "每一頁有自己的筆記欄，自動儲存",
      "重新整理、換裝置登入都還在",
      "和摘要並排顯示，複習一目瞭然",
    ],
    art: <ArtNotes />,
  },
  {
    icon: <Download className="h-4.5 w-4.5" />,
    title: "一鍵匯出筆記",
    body: "讀完的成果不會被鎖在網站裡。每頁摘要加上你的筆記，組成一份完整的複習講義帶走。",
    points: [
      "PDF — 排版完整，適合列印",
      "Word — 拿回去繼續編輯",
      "Markdown — 貼進 Notion、Obsidian",
    ],
    art: <ArtExport />,
  },
];

const EXTRAS = [
  {
    icon: <Sigma className="h-3.5 w-3.5" />,
    label: "KaTeX 數學式渲染",
  },
  {
    icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
    label: "自訂 AI 語氣與格式",
  },
  {
    icon: <Moon className="h-3.5 w-3.5" />,
    label: "深色模式",
  },
];

/** Google mark on a small white chip so brand colours stay legible on the accent button. */
function GoogleChip() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
      <svg width="12" height="12" viewBox="0 0 18 18" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
    </span>
  );
}

const LANDING_CSS = `
.landing { --marker: rgba(250, 204, 21, 0.5); }
.dark .landing { --marker: rgba(250, 204, 21, 0.32); }

/* Highlighter swipe under key phrases — the page's signature. */
.landing .marker {
  background: linear-gradient(
    transparent 52%,
    var(--marker) 52%,
    var(--marker) 94%,
    transparent 94%
  );
  padding: 0 0.08em;
}

/* Faint notebook ruling behind the hero. */
.landing .hero-ruled {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 31px,
    color-mix(in srgb, var(--border) 55%, transparent) 31px,
    color-mix(in srgb, var(--border) 55%, transparent) 32px
  );
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 0%, black 70%, transparent 100%);
}

/* Page-load reveal (hero only — below the fold uses scroll reveal). */
.landing .reveal {
  animation: landing-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.landing .reveal-2 { animation-delay: 0.12s; }
@keyframes landing-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scroll-triggered reveal — ScrollFx adds .in-view on first intersection. */
.landing [data-reveal] {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.65s ease,
    transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
}
.landing [data-reveal="left"] { transform: translateX(-28px); }
.landing [data-reveal="right"] { transform: translateX(28px); }
.landing [data-reveal].in-view {
  opacity: 1;
  transform: none;
}

/* Q&A bubble pop inside the demo. */
.landing .demo-pop {
  animation: landing-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes landing-pop {
  from { opacity: 0; transform: translateY(6px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Region-select box drawing over the demo chart. */
.landing .demo-select {
  animation: landing-select 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  transform-origin: center;
}
@keyframes landing-select {
  from { opacity: 0; transform: scale(0.55); }
  to { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .landing .reveal,
  .landing .reveal-2,
  .landing .demo-pop,
  .landing .demo-select { animation: none; }
  .landing [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

@media (max-width: 420px) {
  .landing .demo-window { font-size: 0.9em; }
}
`;
