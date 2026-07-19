import {
  Check,
  Download,
  FileText,
  PenLine,
  ScanSearch,
  Sparkles,
  Upload,
} from "lucide-react";

/**
 * Hand-drawn (CSS/SVG) product vignettes for the landing page.
 * All decorative — every root carries aria-hidden and a text alternative
 * lives in the copy next to it. Pure JSX, safe to render on the server.
 */

function Vignette({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden rounded-xl border p-4 ${className}`}
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- Step arts (small, sit on top of the 3 step cards) ---- */

export function StepUploadArt() {
  return (
    <Vignette className="h-32">
      <div
        className="grid h-full place-items-center rounded-lg border-2 border-dashed"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 45%, var(--border))",
          background: "color-mix(in srgb, var(--accent) 5%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Upload className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">機器學習導論.pdf</p>
            <p className="text-[10px] text-faint">2.4 MB · 24 頁</p>
          </div>
        </div>
      </div>
    </Vignette>
  );
}

export function StepReadArt() {
  return (
    <Vignette className="h-32">
      <div className="grid h-full grid-cols-[1.1fr_1fr] gap-2.5">
        {/* mini slide */}
        <div
          className="rounded-md border p-2"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div className="h-1.5 w-2/3 rounded bg-gray-300" />
          <div className="mt-1.5 space-y-1">
            <div className="h-1 w-full rounded bg-gray-200" />
            <div className="h-1 w-4/5 rounded bg-gray-200" />
          </div>
          <svg viewBox="0 0 100 40" className="mt-1.5 w-full">
            <polyline
              points="6,34 48,34 92,6"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {/* mini summary */}
        <div
          className="rounded-md border p-2"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="flex items-center gap-1 text-[9px] font-semibold"
            style={{ color: "var(--accent)" }}
          >
            <Sparkles className="h-2.5 w-2.5" /> 本頁摘要
          </p>
          <div className="mt-1.5 space-y-1">
            <div className="h-1 w-full rounded" style={{ background: "var(--border-strong)" }} />
            <div className="h-1 w-5/6 rounded" style={{ background: "var(--border-strong)" }} />
            <div className="h-1 w-1/2 rounded" style={{ background: "var(--border-strong)" }} />
          </div>
        </div>
      </div>
    </Vignette>
  );
}

export function StepExportArt() {
  return (
    <Vignette className="h-32">
      <div className="flex h-full flex-col justify-center gap-1.5">
        {[
          { label: "lecture-notes.pdf", badge: "PDF" },
          { label: "lecture-notes.docx", badge: "Word" },
          { label: "lecture-notes.md", badge: "MD" },
        ].map((file) => (
          <div
            key={file.badge}
            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
            style={{ borderColor: "var(--border)" }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-[11px] font-medium">{file.label}</span>
            <span className="chip ml-auto !py-0 text-[9px]">{file.badge}</span>
            <Download className="h-3 w-3 text-faint" />
          </div>
        ))}
      </div>
    </Vignette>
  );
}

/* ---------------- Feature arts (larger, alternate beside the copy) ----- */

export function ArtStreamSummary() {
  return (
    <Vignette>
      <div
        className="rounded-lg border p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          本頁摘要
          <span className="chip ml-auto !py-0 text-[9px]">串流中</span>
        </p>
        <p className="stream-caret text-[13px] leading-relaxed">
          ReLU 將負值歸零、正值原樣輸出，計算快且能緩解梯度消失；缺點是輸入長期為負時
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="skeleton h-2 w-4/5" />
          <div className="skeleton h-2 w-3/5" />
        </div>
      </div>
      <p className="mt-2.5 text-center text-[11px] text-faint">
        第一個字約 1 秒出現，看過的頁面即開即現
      </p>
    </Vignette>
  );
}

export function ArtSelectAsk() {
  return (
    <Vignette>
      {/* slide text with a text selection */}
      <div
        className="relative rounded-lg border bg-white p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-[12px] leading-relaxed text-gray-700">
          反向傳播演算法中，
          <span
            className="rounded-sm px-0.5"
            style={{
              background: "color-mix(in srgb, var(--accent) 26%, transparent)",
            }}
          >
            誤差沿著網路往回傳遞，以鏈鎖律逐層計算梯度
          </span>
          ，並依學習率更新權重。
        </p>
        <span
          className="absolute -bottom-3 right-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-md"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <Sparkles className="h-2.5 w-2.5" /> Ask AI
        </span>
      </div>
      {/* Q&A bubbles */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-end">
          <p
            className="rounded-xl rounded-br-sm px-2.5 py-1.5 text-[11px]"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            鏈鎖律在這裡是怎麼用的？
          </p>
        </div>
        <div className="flex justify-start">
          <p
            className="max-w-[85%] rounded-xl rounded-bl-sm border px-2.5 py-1.5 text-[11px] leading-relaxed"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            每一層的梯度 = 下一層傳回的梯度 × 本層激活函數的導數，一路乘回輸入層。
          </p>
        </div>
      </div>
    </Vignette>
  );
}

export function ArtRegionAsk() {
  return (
    <Vignette>
      <div
        className="relative rounded-lg border bg-white p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-[11px] font-bold text-gray-800">供給與需求：均衡價格</p>
        <svg viewBox="0 0 200 92" className="mt-1 w-full">
          <line x1="14" y1="80" x2="190" y2="80" stroke="#d1d5db" strokeWidth="1.5" />
          <line x1="14" y1="6" x2="14" y2="80" stroke="#d1d5db" strokeWidth="1.5" />
          <line x1="26" y1="14" x2="176" y2="72" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
          <line x1="26" y1="72" x2="176" y2="14" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
          <circle cx="101" cy="43" r="4" fill="var(--accent)" />
          <text x="180" y="76" fontSize="8" fill="#9ca3af">D</text>
          <text x="180" y="14" fontSize="8" fill="#9ca3af">S</text>
        </svg>
        {/* dashed selection box over the intersection */}
        <span
          className="absolute rounded-md"
          style={{
            left: "34%",
            right: "34%",
            top: "30%",
            bottom: "22%",
            border: "1.5px dashed var(--accent)",
            background: "color-mix(in srgb, var(--accent) 9%, transparent)",
          }}
        >
          <span
            className="absolute -bottom-2.5 -right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold shadow-md"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <ScanSearch className="h-2.5 w-2.5" /> Ask AI
          </span>
        </span>
      </div>
      <div className="mt-3.5 flex justify-end">
        <div
          className="rounded-xl rounded-br-sm px-2.5 py-1.5"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <p className="mb-0.5 flex items-center gap-1 text-[9px] opacity-85">
            <ScanSearch className="h-2.5 w-2.5" /> 已圈選圖表區域
          </p>
          <p className="text-[11px]">為什麼交點是均衡價格？</p>
        </div>
      </div>
    </Vignette>
  );
}

export function ArtNotes() {
  return (
    <Vignette>
      <div
        className="rounded-lg border p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <PenLine className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          我的筆記 · 第 3 頁
          <span className="ml-auto flex items-center gap-1 text-[9px] text-faint">
            <Check className="h-2.5 w-2.5" /> 已自動儲存
          </span>
        </p>
        <ul className="space-y-1.5 text-[12px] leading-relaxed">
          <li className="flex gap-1.5">
            <span style={{ color: "var(--accent)" }}>•</span>
            ReLU 比 sigmoid 快，因為不用算指數
          </li>
          <li className="flex gap-1.5">
            <span style={{ color: "var(--accent)" }}>•</span>
            考點：神經元死亡 → Leaky ReLU 解法
          </li>
          <li className="flex gap-1.5">
            <span style={{ color: "var(--accent)" }}>•</span>
            <span className="stream-caret">回去複習第 2 章的梯度定義</span>
          </li>
        </ul>
      </div>
      <p className="mt-2.5 text-center text-[11px] text-faint">
        筆記跟著頁碼走，翻到哪、記到哪
      </p>
    </Vignette>
  );
}

export function ArtExport() {
  return (
    <Vignette>
      <div
        className="rounded-lg border p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="mb-2.5 text-xs font-semibold">匯出筆記</p>
        <div className="space-y-1.5">
          {[
            { label: "PDF — 排版最完整，適合列印", active: true },
            { label: "Word (.docx) — 可以繼續編輯", active: false },
            { label: "Markdown — 貼進 Notion / Obsidian", active: false },
          ].map((option) => (
            <div
              key={option.label}
              className="flex items-center gap-2 rounded-md border px-2.5 py-2"
              style={{
                borderColor: option.active ? "var(--accent)" : "var(--border)",
                background: option.active
                  ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                  : "transparent",
              }}
            >
              <span
                className="grid h-3.5 w-3.5 place-items-center rounded-full border"
                style={{
                  borderColor: option.active ? "var(--accent)" : "var(--border-strong)",
                }}
              >
                {option.active && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </span>
              <span className="text-[11px]">{option.label}</span>
            </div>
          ))}
        </div>
        <span
          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <Download className="h-3 w-3" /> 下載（每頁摘要 + 我的筆記）
        </span>
      </div>
    </Vignette>
  );
}
