import {
  DEFAULT_SUMMARY_USER_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildFormatDirective,
  summaryFormatInstructions,
} from "./prompts/summary";
import {
  DEFAULT_QA_SYSTEM_PROMPT,
  DEFAULT_QA_USER_PROMPT,
  QA_FORMAT_INSTRUCTION,
} from "./prompts/qa";
import { languageInstructions, toneInstructions } from "./prompts/shared";

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
      QA_FORMAT_INSTRUCTION,
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
