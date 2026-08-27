import { Anthropic } from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
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

export type AiProvider = "openai" | "anthropic" | "gemini";

// Keep existing deployments on Anthropic until AI_PROVIDER is explicitly set.
const providerValue =
  process.env.AI_PROVIDER?.trim().toLowerCase() || "anthropic";

if (!isAiProvider(providerValue)) {
  throw new Error(
    `Unsupported AI_PROVIDER "${providerValue}". Use openai, anthropic, or gemini.`,
  );
}

export const AI_PROVIDER: AiProvider = providerValue;

const PROVIDER_MODELS: Record<AiProvider, string> = {
  openai: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  gemini: process.env.GEMINI_MODEL || "gemini-3.6-flash",
};

export const AI_MODEL = PROVIDER_MODELS[AI_PROVIDER];

const openai =
  AI_PROVIDER === "openai"
    ? new OpenAI({
        apiKey: requireEnv("OPENAI_API_KEY"),
        baseURL: process.env.OPENAI_BASE_URL || undefined,
      })
    : null;

const anthropic =
  AI_PROVIDER === "anthropic"
    ? new Anthropic({
        apiKey: requireEnv("ANTHROPIC_API_KEY"),
        baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      })
    : null;

const gemini =
  AI_PROVIDER === "gemini"
    ? new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") })
    : null;

type ImageSource = {
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
};

type AiInput = {
  systemPrompt: string;
  userPrompt: string;
  image: ImageSource | null;
  maxOutputTokens: number;
};

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

function buildSummaryInput(
  pageText: string,
  customSystemPrompt: string | undefined,
  customUserPrompt: string | undefined,
  image: ImageSource | null,
): AiInput {
  const trimmedUserPrompt = customUserPrompt?.trim() ?? "";
  const textPrompt = trimmedUserPrompt
    ? trimmedUserPrompt.includes("{{pageText}}")
      ? fillPromptTemplate(trimmedUserPrompt, { pageText })
      : `${trimmedUserPrompt}\n\n頁面內容：\n${pageText}`
    : pageText;
  const userPrompt = image
    ? pageText.trim()
      ? `${textPrompt}\n\n（這一頁文字內容有限，請根據附上的頁面圖片做摘要。）`
      : "這一頁以圖片為主、幾乎沒有可擷取的文字。請直接根據附上的頁面圖片內容做摘要。"
    : textPrompt;

  return {
    systemPrompt: customSystemPrompt?.trim() || SUMMARY_SYSTEM_PROMPT,
    userPrompt,
    image,
    maxOutputTokens: 2048,
  };
}

function buildQAInput(input: {
  pageText: string;
  selectedText: string;
  question: string;
  systemPrompt?: string;
  userPrompt?: string;
  image: ImageSource | null;
}): AiInput {
  const { pageText, selectedText, question, userPrompt, image } = input;
  const finalUserPrompt = userPrompt?.trim()
    ? fillPromptTemplate(userPrompt, { pageText, selectedText, question })
    : `講義頁面內容：\n${pageText}\n\n使用者選取文字：\n${selectedText}\n\n問題：\n${question}`;
  const textBody = finalUserPrompt.includes(pageText)
    ? finalUserPrompt
    : `${finalUserPrompt}\n\n講義頁面內容：\n${pageText}`;

  return {
    systemPrompt: input.systemPrompt?.trim() || DEFAULT_QA_SYSTEM,
    userPrompt: image
      ? `使用者圈選了附上的圖片區域，並提出問題：\n${question}\n\n請根據圖片內容回答。${
          pageText.trim() ? `\n\n本頁文字內容供參考：\n${pageText}` : ""
        }`
      : textBody,
    image,
    maxOutputTokens: 1024,
  };
}

/** Non-streaming summary (used by export + background prefetch). */
export async function summaryOnePage(
  pageText: string,
  customSystemPrompt?: string,
  customUserPrompt?: string,
  image?: ImageSource | null,
) {
  return generateText(
    buildSummaryInput(
      pageText,
      customSystemPrompt,
      customUserPrompt,
      image ?? null,
    ),
  );
}

/** Streaming summary normalized to plain text deltas for route handlers. */
export function streamSummaryOnePage(
  pageText: string,
  customSystemPrompt?: string,
  customUserPrompt?: string,
  image?: ImageSource | null,
) {
  return streamText(
    buildSummaryInput(
      pageText,
      customSystemPrompt,
      customUserPrompt,
      image ?? null,
    ),
  );
}

const DEFAULT_QA_SYSTEM =
  "你是一位專業的學術助理。請根據講義頁面內容與使用者選取的文字（或圈選的圖片區域），用繁體中文回答問題。只能根據提供內容回答，不要編造。";

export async function answerQuestionAboutPage(input: {
  pageText: string;
  selectedText: string;
  question: string;
  systemPrompt?: string;
  userPrompt?: string;
  image?: ImageSource | null;
}) {
  return generateText(buildQAInput({ ...input, image: input.image ?? null }));
}

/** Streaming Q&A normalized to plain text deltas for route handlers. */
export function streamAnswerAboutPage(input: {
  pageText: string;
  selectedText: string;
  question: string;
  systemPrompt?: string;
  userPrompt?: string;
  image?: ImageSource | null;
}) {
  return streamText(buildQAInput({ ...input, image: input.image ?? null }));
}

async function generateText(input: AiInput): Promise<string> {
  switch (AI_PROVIDER) {
    case "openai": {
      const response = await openai!.responses.create({
        model: AI_MODEL,
        instructions: input.systemPrompt,
        input: openAiContent(input),
        max_output_tokens: input.maxOutputTokens,
      });
      return response.output_text || "無法產生回答";
    }
    case "anthropic": {
      const response = await anthropic!.messages.create({
        model: AI_MODEL,
        max_tokens: input.maxOutputTokens,
        system: input.systemPrompt,
        messages: [{ role: "user", content: anthropicContent(input) }],
      });
      const block = response.content.find((part) => part.type === "text");
      return block?.type === "text" ? block.text : "無法產生回答";
    }
    case "gemini": {
      const response = await gemini!.models.generateContent({
        model: AI_MODEL,
        contents: geminiContent(input),
        config: {
          systemInstruction: input.systemPrompt,
          maxOutputTokens: input.maxOutputTokens,
        },
      });
      return response.text || "無法產生回答";
    }
  }
}

async function* streamText(input: AiInput): AsyncGenerator<string> {
  switch (AI_PROVIDER) {
    case "openai": {
      const stream = await openai!.responses.create({
        model: AI_MODEL,
        instructions: input.systemPrompt,
        input: openAiContent(input),
        max_output_tokens: input.maxOutputTokens,
        stream: true,
      });
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") yield event.delta;
      }
      return;
    }
    case "anthropic": {
      const stream = anthropic!.messages.stream({
        model: AI_MODEL,
        max_tokens: input.maxOutputTokens,
        system: input.systemPrompt,
        messages: [{ role: "user", content: anthropicContent(input) }],
      });
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
      return;
    }
    case "gemini": {
      const stream = await gemini!.models.generateContentStream({
        model: AI_MODEL,
        contents: geminiContent(input),
        config: {
          systemInstruction: input.systemPrompt,
          maxOutputTokens: input.maxOutputTokens,
        },
      });
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    }
  }
}

function openAiContent(input: AiInput) {
  return [
    {
      role: "user" as const,
      content: input.image
        ? [
            {
              type: "input_image" as const,
              image_url: imageDataUrl(input.image),
              detail: "auto" as const,
            },
            { type: "input_text" as const, text: input.userPrompt },
          ]
        : [{ type: "input_text" as const, text: input.userPrompt }],
    },
  ];
}

function anthropicContent(input: AiInput): Anthropic.MessageParam["content"] {
  if (!input.image) return input.userPrompt;
  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.mediaType,
        data: input.image.data,
      },
    },
    { type: "text", text: input.userPrompt },
  ];
}

function geminiContent(input: AiInput) {
  return input.image
    ? [
        {
          inlineData: {
            mimeType: input.image.mediaType,
            data: input.image.data,
          },
        },
        { text: input.userPrompt },
      ]
    : [{ text: input.userPrompt }];
}

function imageDataUrl(image: ImageSource) {
  return `data:${image.mediaType};base64,${image.data}`;
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
  pages: Array<{ pageNumber: number; extractedText: string }>;
}): Promise<PromptSuggestionAnalysis> {
  const rawText = await generateText({
    systemPrompt: SUGGEST_PROMPT_PREFERENCES_SYSTEM_PROMPT,
    userPrompt: buildPromptSuggestionUserPrompt(input),
    image: null,
    maxOutputTokens: 1200,
  });
  return normalizePromptSuggestionAnalysis(parseJsonObject(rawText));
}

function parseJsonObject(text: string): unknown {
  const jsonText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const match = jsonText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Prompt suggestion response was not valid JSON");
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

function isAiProvider(value: string): value is AiProvider {
  return value === "openai" || value === "anthropic" || value === "gemini";
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when using ${AI_PROVIDER}`);
  return value;
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
