import type {
  DocumentFormat,
  PromptPreferences,
  PromptTone,
  SummaryFormat,
} from "../prompt_preferences";

export const SUMMARY_SYSTEM_PROMPT = `你是一位專業的學術助理，專門協助學生閱讀講義、論文與課程教材。

# 你的任務
為使用者指定的「當前頁」產生一份清楚、完整、忠於原文的摘要或解說。

# 原則
- **忠於原文**：只根據提供的頁面內容，不得添加未出現的資訊，也不要自行補完缺失的細節。
- **保留術語**：學術或專業名詞（例如演算法名稱、定理、英文縮寫）原樣保留，必要時加一句中文白話解釋。
- **清楚優先**：不要為了精簡而省略關鍵步驟、條件或前提；但也不要逐字重複原文。

# 輸出格式
使用 Markdown。實際的語氣、詳略程度與呈現方式，請依使用者選擇的文件類型、口吻與摘要格式調整（見下方指示）。

# 注意
- 若當前頁內容過少（少於兩句完整文字、或僅為標題頁），直接說明「這是 X 章節的章首頁，內容是…」即可，不要硬湊重點。
- 若頁面以圖表為主、文字很少，就說明「本頁主要為圖表，文字內容有限」並摘要可見的標題或註解。`;

export const DEFAULT_SUMMARY_USER_PROMPT =
  "請根據以下 PDF 頁面內容產生摘要。\n\n頁面內容：\n{{pageText}}";

export const summaryFormatInstructions: Record<SummaryFormat, string> = {
  bullets:
    "摘要格式：條列式。請先給一句主旨，再用清楚的 bullet points 列出重點，每點精簡。",
  full:
    "摘要格式：完整說明。請用段落把本頁內容說清楚，涵蓋重要細節、前提與前後關係，必要時搭配少量條列。",
  exam: "摘要格式：考前重點整理。請標出可能會考的定義、公式、步驟、比較與易混淆處。",
};

export const DOCUMENT_FORMAT_LABELS: Record<DocumentFormat, string> = {
  slides: "簡報",
  paper: "論文",
  textbook: "課本",
  exam: "考題",
  custom: "文件",
};

const toneLabels: Record<PromptTone, string> = {
  concise: "簡潔",
  detailed: "詳細",
  teaching: "教學",
};

const summaryFormatLabels: Record<SummaryFormat, string> = {
  bullets: "條列式",
  full: "完整說明",
  exam: "考前重點整理",
};

/**
 * A single directive tying the chosen document format, tone, and summary
 * format together, e.g. 「這是一份論文文件，請讀取後用詳細的口吻，產出完整說明的內容。」
 */
export function buildFormatDirective(preferences: PromptPreferences): string {
  const tone = toneLabels[preferences.tone];
  const format = summaryFormatLabels[preferences.summaryFormat];
  if (preferences.documentFormat === "custom") {
    return `請讀取本頁內容後，用${tone}的口吻，產出${format}的內容。`;
  }
  const docLabel = DOCUMENT_FORMAT_LABELS[preferences.documentFormat];
  return `這是一份${docLabel}文件，請讀取本頁內容後，用${tone}的口吻，產出${format}的內容。`;
}
