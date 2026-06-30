import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary";

export type PromptTone = "concise" | "detailed" | "teaching";
export type PromptLanguage = "zh-TW" | "en";
export type SummaryFormat = "key-points" | "bullets" | "exam";

export type PromptPreferences = {
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
  "tone": "concise | detailed | teaching",
  "summaryFormat": "key-points | bullets | exam",
  "extraInstructions": "給 AI 的繁中補充指令，最多 4 句",
  "hasDenseTechnicalContent": true,
  "looksExamOrLecture": true,
  "hasMathContent": false,
  "hasCodeContent": false,
  "reason": "用繁體中文解釋為何如此建議，1 到 2 句"
}`,
  ].join("\n");
}

export const DEFAULT_PROMPT_PREFERENCES: PromptPreferences = {
  tone: "teaching",
  language: "zh-TW",
  summaryFormat: "key-points",
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
  "key-points":
    "摘要格式：重點式。請先給一句主旨，再列出 3 到 6 個最重要的重點。",
  bullets: "摘要格式：條列式。請用清楚的 bullet points 組織內容。",
  exam: "摘要格式：考試重點。請標出可能會考的定義、公式、步驟、比較與易混淆處。",
};

export function mergePromptPreferences(value: unknown): PromptPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PROMPT_PREFERENCES;
  }

  const input = value as Partial<PromptPreferences>;

  return {
    ...DEFAULT_PROMPT_PREFERENCES,
    ...input,
    tone: isPromptTone(input.tone)
      ? input.tone
      : DEFAULT_PROMPT_PREFERENCES.tone,
    language: isPromptLanguage(input.language)
      ? input.language
      : DEFAULT_PROMPT_PREFERENCES.language,
    summaryFormat: isSummaryFormat(input.summaryFormat)
      ? input.summaryFormat
      : DEFAULT_PROMPT_PREFERENCES.summaryFormat,
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

function isSummaryFormat(value: unknown): value is SummaryFormat {
  return value === "key-points" || value === "bullets" || value === "exam";
}
