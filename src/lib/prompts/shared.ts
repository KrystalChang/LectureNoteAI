import type { PromptLanguage, PromptTone } from "../prompt_preferences";

/**
 * Tone and language building blocks shared by both the summary and Q&A
 * prompts.
 */

export const toneInstructions: Record<PromptTone, string> = {
  concise: "回答語氣：簡潔。請優先給出直接結論，避免冗長鋪陳。",
  detailed: "回答語氣：詳細。請補足必要背景、條件、步驟與關鍵細節。",
  teaching:
    "回答語氣：教學式。請像家教一樣拆解概念，必要時用簡單例子幫助理解。",
};

export const languageInstructions: Record<PromptLanguage, string> = {
  "zh-TW": "輸出語言：繁體中文。專有名詞可保留英文並補充中文說明。",
  en: "Output language: English. Keep technical terms precise and explain them clearly.",
};
