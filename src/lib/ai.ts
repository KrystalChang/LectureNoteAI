import { Anthropic } from "@anthropic-ai/sdk";
import {
  DocumentFormat,
  PromptTone,
  SummaryFormat,
  fillPromptTemplate,
} from "./prompt_preferences";
import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary";
import {
  SUGGEST_PROMPT_PREFERENCES_SYSTEM_PROMPT,
  buildPromptSuggestionUserPrompt,
} from "./prompts/suggest";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
  baseURL: process.env["ANTHROPIC_BASE_URL"],
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export const AI_MODEL = MODEL;

type ImageSource = {
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
};

/**
 * Parse a data URL (`data:image/png;base64,....`) into an Anthropic image
 * source. Returns null if the string isn't a supported base64 image.
 */
export function parseImageDataUrl(value: unknown): ImageSource | null {
  if (typeof value !== "string") return null;
  const match = value.match(
    /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match) return null;
  const rawType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  return {
    mediaType: rawType as ImageSource["mediaType"],
    data: match[2],
  };
}

function buildSummaryUserContent(
  pageText: string,
  customUserPrompt: string | undefined,
  image: ImageSource | null,
): Anthropic.MessageParam["content"] {
  const trimmedUserPrompt = customUserPrompt?.trim() ?? "";
  const textPrompt = trimmedUserPrompt
    ? trimmedUserPrompt.includes("{{pageText}}")
      ? fillPromptTemplate(trimmedUserPrompt, { pageText })
      : `${trimmedUserPrompt}\n\n頁面內容：\n${pageText}`
    : pageText;

  if (image) {
    const instruction = pageText.trim()
      ? `${textPrompt}\n\n（這一頁文字內容有限，以下附上頁面圖片，請直接根據圖片內容做摘要。）`
      : "這一頁以圖片為主、幾乎沒有可擷取的文字。請直接根據下方頁面圖片的內容（圖表、流程、標題、示意圖等）做摘要。";
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      },
      { type: "text", text: instruction },
    ];
  }

  return textPrompt;
}

function resolveSummarySystem(customSystemPrompt?: string) {
  return [
    {
      type: "text" as const,
      // Marked cacheable — identical for every page, so after the first call
      // subsequent ones read it from Anthropic's prompt cache (~10% cost).
      text: customSystemPrompt?.trim() || SUMMARY_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/** Non-streaming summary (used by export + background prefetch). */
export async function summaryOnePage(
  pageText: string,
  customSystemPrompt?: string,
  customUserPrompt?: string,
  image?: ImageSource | null,
) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: resolveSummarySystem(customSystemPrompt),
    messages: [
      {
        role: "user",
        content: buildSummaryUserContent(
          pageText,
          customUserPrompt,
          image ?? null,
        ),
      },
    ],
  });

  const block = message.content[0];
  return block?.type === "text" ? block.text : "無法產生摘要";
}

/** Streaming summary — returns the Anthropic stream for the route to iterate. */
export function streamSummaryOnePage(
  pageText: string,
  customSystemPrompt?: string,
  customUserPrompt?: string,
  image?: ImageSource | null,
) {
  return client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: resolveSummarySystem(customSystemPrompt),
    messages: [
      {
        role: "user",
        content: buildSummaryUserContent(
          pageText,
          customUserPrompt,
          image ?? null,
        ),
      },
    ],
  });
}

const DEFAULT_QA_SYSTEM =
  "你是一位專業的學術助理。請根據講義頁面內容與使用者選取的文字（或圈選的圖片區域），用繁體中文回答問題。只能根據提供內容回答，不要編造。";

function buildQAContent(input: {
  pageText: string;
  selectedText: string;
  question: string;
  userPrompt?: string;
  image: ImageSource | null;
}): Anthropic.MessageParam["content"] {
  const { pageText, selectedText, question, userPrompt, image } = input;

  const finalUserPrompt = userPrompt?.trim()
    ? fillPromptTemplate(userPrompt, { pageText, selectedText, question })
    : `講義頁面內容：\n${pageText}\n\n使用者選取文字：\n${selectedText}\n\n問題：\n${question}`;

  const textBody = finalUserPrompt.includes(pageText)
    ? finalUserPrompt
    : `${finalUserPrompt}\n\n講義頁面內容：\n${pageText}`;

  if (image) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      },
      {
        type: "text",
        text: `使用者圈選了這一頁的一個圖片區域（如上圖），並提出問題：\n${question}\n\n請根據圈選的圖片內容回答。${
          pageText.trim() ? `\n\n（本頁文字內容供參考）：\n${pageText}` : ""
        }`,
      },
    ];
  }

  return textBody;
}

/** Non-streaming Q&A. */
export async function answerQuestionAboutPage(input: {
  pageText: string;
  selectedText: string;
  question: string;
  systemPrompt?: string;
  userPrompt?: string;
  image?: ImageSource | null;
}) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: input.systemPrompt?.trim() || DEFAULT_QA_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildQAContent({ ...input, image: input.image ?? null }),
      },
    ],
  });

  const block = message.content[0];
  return block?.type === "text" ? block.text : "無法產生回答";
}

/** Streaming Q&A — returns the Anthropic stream for the route to iterate. */
export function streamAnswerAboutPage(input: {
  pageText: string;
  selectedText: string;
  question: string;
  systemPrompt?: string;
  userPrompt?: string;
  image?: ImageSource | null;
}) {
  return client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: input.systemPrompt?.trim() || DEFAULT_QA_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildQAContent({ ...input, image: input.image ?? null }),
      },
    ],
  });
}

export type PromptSuggestionAnalysis = {
  topic: string;
  documentFormat: DocumentFormat;
  tone: PromptTone;
  summaryFormat: SummaryFormat;
  extraInstructions: string;
  hasDenseTechnicalContent: boolean;
  looksExamOrLecture: boolean;
  hasMathContent: boolean;
  hasCodeContent: boolean;
  reason: string;
};

export async function suggestPromptPreferencesFromDocument(input: {
  documentName: string;
  pages: Array<{
    pageNumber: number;
    extractedText: string;
  }>;
}): Promise<PromptSuggestionAnalysis> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text: SUGGEST_PROMPT_PREFERENCES_SYSTEM_PROMPT,
      },
    ],
    messages: [
      {
        role: "user",
        content: buildPromptSuggestionUserPrompt(input),
      },
    ],
  });

  const block = message.content[0];
  const rawText = block?.type === "text" ? block.text : "";

  return normalizePromptSuggestionAnalysis(parseJsonObject(rawText));
}

function parseJsonObject(text: string): unknown {
  const jsonText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const match = jsonText.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("Prompt suggestion response was not valid JSON");
  }

  return JSON.parse(match[0]);
}

function normalizePromptSuggestionAnalysis(
  value: unknown,
): PromptSuggestionAnalysis {
  const input = isRecord(value) ? value : {};

  return {
    topic: stringOr(input.topic, "一般講義"),
    documentFormat: pick(
      input.documentFormat,
      ["slides", "paper", "textbook", "exam", "custom"],
      "custom",
    ),
    tone: pick(input.tone, ["concise", "detailed", "teaching"], "teaching"),
    summaryFormat: pick(
      input.summaryFormat,
      ["bullets", "full", "exam"],
      "full",
    ),
    extraInstructions: stringOr(
      input.extraInstructions,
      "保留重要英文術語，並在第一次出現時補充簡短中文解釋。",
    ),
    hasDenseTechnicalContent: input.hasDenseTechnicalContent === true,
    looksExamOrLecture: input.looksExamOrLecture === true,
    hasMathContent: input.hasMathContent === true,
    hasCodeContent: input.hasCodeContent === true,
    reason: stringOr(
      input.reason,
      "已根據文件前五頁內容套用較適合閱讀講義的 AI 設定。",
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function pick<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}
