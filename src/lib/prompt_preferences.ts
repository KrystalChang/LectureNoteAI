import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary";

export type PromptTone = "concise" | "detailed" | "teaching";
export type PromptLanguage = "zh-TW" | "en";
// 條列式 (bullets) / 完整說明 (full) / 考前重點整理 (exam)
export type SummaryFormat = "bullets" | "full" | "exam";
// 簡報 / 論文 / 課本 / 考題 / 自訂
export type DocumentFormat =
  | "slides"
  | "paper"
  | "textbook"
  | "exam"
  | "custom";

export type PromptPreferences = {
  documentFormat: DocumentFormat;
  tone: PromptTone;
  language: PromptLanguage;
  summaryFormat: SummaryFormat;
  extraInstructions: string;
  useCustomSummaryPrompt: boolean;
  customSummarySystemPrompt: string;
  customSummaryUserPrompt: string;
  useCustomQAPrompt: boolean;
  customQASystemPrompt: string;
  customQAUserPrompt: string;
};

export type BuiltPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export const PROMPT_PREFERENCES_STORAGE_KEY = "lectureNoteAi.promptPreferences";

export const DEFAULT_SUMMARY_USER_PROMPT =
  "請根據以下 PDF 頁面內容產生摘要。\n\n頁面內容：\n{{pageText}}";

export const DEFAULT_QA_SYSTEM_PROMPT =
  "你是一位專業的學術助理。請根據講義頁面內容與使用者選取的文字回答問題。只能根據提供內容回答，不要編造。";

export const DEFAULT_QA_USER_PROMPT =
  "請根據以下 PDF 內容回答問題。\n\n當前頁內容：\n{{pageText}}\n\n使用者選取文字：\n{{selectedText}}\n\n使用者問題：\n{{question}}";

export const SUGGEST_PROMPT_PREFERENCES_SYSTEM_PROMPT = [
  "你是 LectureNoteAI 的文件分析器。",
  "請根據 PDF 的標題與前五頁文字，為學習助理推薦 prompt preferences。",
  "先判斷文件類型（documentFormat）：簡報投影片=slides、學術論文=paper、課本教材=textbook、考卷或題目=exam；都不像則用 custom。",
  "輸出必須是有效 JSON，不要加 markdown code fence。",
  "語言設定不用判斷，產品預設一律使用繁體中文。",
].join("\n");

export function buildPromptSuggestionUserPrompt(input: {
  documentName: string;
  pages: Array<{
    pageNumber: number;
    extractedText: string;
  }>;
}) {
  const previewText = input.pages
    .slice(0, 5)
    .map((page) => {
      const pageText = page.extractedText.trim().slice(0, 6000);
      return `# Page ${page.pageNumber}\n${pageText}`;
    })
    .join("\n\n");

  return [
    `文件名稱：${input.documentName}`,
    "",
    "前五頁內容：",
    previewText || "No extracted text.",
    "",
    "請回傳 JSON，格式如下：",
    `{
  "topic": "文件主題，10 到 30 字",
  "documentFormat": "slides | paper | textbook | exam | custom",
  "tone": "concise | detailed | teaching",
  "summaryFormat": "bullets | full | exam",
  "extraInstructions": "給 AI 的繁中補充指令，最多 4 句",
  "hasDenseTechnicalContent": true,
  "looksExamOrLecture": true,
  "hasMathContent": false,
  "hasCodeContent": false,
  "reason": "用繁體中文解釋為何如此建議，1 到 2 句"
}`,
  ].join("\n");
}

/**
 * When the user picks a document format, tone + summary format are auto-filled
 * from this table (they can still override afterwards). `custom` has no preset:
 * the user chooses tone/format freely.
 */
export const FORMAT_PRESETS: Record<
  Exclude<DocumentFormat, "custom">,
  { tone: PromptTone; summaryFormat: SummaryFormat }
> = {
  paper: { tone: "detailed", summaryFormat: "full" },
  slides: { tone: "concise", summaryFormat: "bullets" },
  textbook: { tone: "teaching", summaryFormat: "full" },
  exam: { tone: "teaching", summaryFormat: "exam" },
};

/** Returns the tone/summaryFormat a format implies, or null for `custom`. */
export function formatPresetFor(
  format: DocumentFormat,
): { tone: PromptTone; summaryFormat: SummaryFormat } | null {
  return format === "custom" ? null : FORMAT_PRESETS[format];
}

/**
 * Applies a format's preset onto a set of preferences. `custom` leaves
 * tone/summaryFormat untouched.
 */
export function applyDocumentFormat(
  preferences: PromptPreferences,
  format: DocumentFormat,
): PromptPreferences {
  const preset = formatPresetFor(format);
  return {
    ...preferences,
    documentFormat: format,
    ...(preset ?? {}),
  };
}

export const DEFAULT_PROMPT_PREFERENCES: PromptPreferences = {
  documentFormat: "custom",
  tone: "teaching",
  language: "zh-TW",
  summaryFormat: "full",
  extraInstructions: "",
  useCustomSummaryPrompt: false,
  customSummarySystemPrompt: SUMMARY_SYSTEM_PROMPT,
  customSummaryUserPrompt: DEFAULT_SUMMARY_USER_PROMPT,
  useCustomQAPrompt: false,
  customQASystemPrompt: DEFAULT_QA_SYSTEM_PROMPT,
  customQAUserPrompt: DEFAULT_QA_USER_PROMPT,
};

const toneInstructions: Record<PromptTone, string> = {
  concise: "回答語氣：簡潔。請優先給出直接結論，避免冗長鋪陳。",
  detailed: "回答語氣：詳細。請補足必要背景、條件、步驟與關鍵細節。",
  teaching:
    "回答語氣：教學式。請像家教一樣拆解概念，必要時用簡單例子幫助理解。",
};

const languageInstructions: Record<PromptLanguage, string> = {
  "zh-TW": "輸出語言：繁體中文。專有名詞可保留英文並補充中文說明。",
  en: "Output language: English. Keep technical terms precise and explain them clearly.",
};

const summaryFormatInstructions: Record<SummaryFormat, string> = {
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
function buildFormatDirective(preferences: PromptPreferences): string {
  const tone = toneLabels[preferences.tone];
  const format = summaryFormatLabels[preferences.summaryFormat];
  if (preferences.documentFormat === "custom") {
    return `請讀取本頁內容後，用${tone}的口吻，產出${format}的內容。`;
  }
  const docLabel = DOCUMENT_FORMAT_LABELS[preferences.documentFormat];
  return `這是一份${docLabel}文件，請讀取本頁內容後，用${tone}的口吻，產出${format}的內容。`;
}

export function mergePromptPreferences(value: unknown): PromptPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PROMPT_PREFERENCES;
  }

  const input = value as Partial<PromptPreferences> & {
    summaryFormat?: unknown;
  };

  return {
    ...DEFAULT_PROMPT_PREFERENCES,
    ...input,
    documentFormat: isDocumentFormat(input.documentFormat)
      ? input.documentFormat
      : DEFAULT_PROMPT_PREFERENCES.documentFormat,
    tone: isPromptTone(input.tone)
      ? input.tone
      : DEFAULT_PROMPT_PREFERENCES.tone,
    language: isPromptLanguage(input.language)
      ? input.language
      : DEFAULT_PROMPT_PREFERENCES.language,
    summaryFormat: normalizeSummaryFormat(input.summaryFormat),
    extraInstructions:
      typeof input.extraInstructions === "string"
        ? input.extraInstructions
        : DEFAULT_PROMPT_PREFERENCES.extraInstructions,
    customSummarySystemPrompt:
      typeof input.customSummarySystemPrompt === "string"
        ? input.customSummarySystemPrompt
        : DEFAULT_PROMPT_PREFERENCES.customSummarySystemPrompt,
    customSummaryUserPrompt:
      typeof input.customSummaryUserPrompt === "string"
        ? input.customSummaryUserPrompt
        : DEFAULT_PROMPT_PREFERENCES.customSummaryUserPrompt,
    customQASystemPrompt:
      typeof input.customQASystemPrompt === "string"
        ? input.customQASystemPrompt
        : DEFAULT_PROMPT_PREFERENCES.customQASystemPrompt,
    customQAUserPrompt:
      typeof input.customQAUserPrompt === "string"
        ? input.customQAUserPrompt
        : DEFAULT_PROMPT_PREFERENCES.customQAUserPrompt,
  };
}

export function buildSummaryPrompt(
  preferences: PromptPreferences,
): BuiltPrompt {
  if (preferences.useCustomSummaryPrompt) {
    return {
      systemPrompt:
        preferences.customSummarySystemPrompt.trim() || SUMMARY_SYSTEM_PROMPT,
      userPrompt:
        preferences.customSummaryUserPrompt.trim() ||
        DEFAULT_SUMMARY_USER_PROMPT,
    };
  }

  return {
    systemPrompt: [
      SUMMARY_SYSTEM_PROMPT,
      buildFormatDirective(preferences),
      toneInstructions[preferences.tone],
      languageInstructions[preferences.language],
      summaryFormatInstructions[preferences.summaryFormat],
      preferences.extraInstructions.trim()
        ? `額外指令：${preferences.extraInstructions.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    userPrompt: DEFAULT_SUMMARY_USER_PROMPT,
  };
}

export function buildQAPrompt(preferences: PromptPreferences): BuiltPrompt {
  if (preferences.useCustomQAPrompt) {
    return {
      systemPrompt:
        preferences.customQASystemPrompt.trim() || DEFAULT_QA_SYSTEM_PROMPT,
      userPrompt:
        preferences.customQAUserPrompt.trim() || DEFAULT_QA_USER_PROMPT,
    };
  }

  return {
    systemPrompt: [
      DEFAULT_QA_SYSTEM_PROMPT,
      toneInstructions[preferences.tone],
      languageInstructions[preferences.language],
      "回答格式：請使用 Markdown。若問題需要步驟，請分點說明。",
      preferences.extraInstructions.trim()
        ? `額外指令：${preferences.extraInstructions.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    userPrompt: DEFAULT_QA_USER_PROMPT,
  };
}

export function fillPromptTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
) {
  let result = template;
  Object.entries(values).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, String(value ?? ""));
  });
  return result;
}

function isPromptTone(value: unknown): value is PromptTone {
  return value === "concise" || value === "detailed" || value === "teaching";
}

function isPromptLanguage(value: unknown): value is PromptLanguage {
  return value === "zh-TW" || value === "en";
}

export function isDocumentFormat(value: unknown): value is DocumentFormat {
  return (
    value === "slides" ||
    value === "paper" ||
    value === "textbook" ||
    value === "exam" ||
    value === "custom"
  );
}

export function isSummaryFormat(value: unknown): value is SummaryFormat {
  return value === "bullets" || value === "full" || value === "exam";
}

/**
 * Coerces a stored summaryFormat to the current enum. Older data used
 * "key-points"; map it to the nearest current value so upgrades are seamless.
 */
function normalizeSummaryFormat(value: unknown): SummaryFormat {
  if (isSummaryFormat(value)) return value;
  if (value === "key-points") return "bullets";
  return DEFAULT_PROMPT_PREFERENCES.summaryFormat;
}
