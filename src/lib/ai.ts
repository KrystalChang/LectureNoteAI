import { Anthropic } from "@anthropic-ai/sdk";
import {
  PromptTone,
  SUGGEST_PROMPT_PREFERENCES_SYSTEM_PROMPT,
  SummaryFormat,
  buildPromptSuggestionUserPrompt,
  fillPromptTemplate,
} from "./prompt_preferences";
import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
  baseURL: process.env["ANTHROPIC_BASE_URL"],
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function summaryOnePage(
  pageText: string,
  customSystemPrompt?: string,
  customUserPrompt?: string,
) {
  const trimmedUserPrompt = customUserPrompt?.trim() ?? "";
  const userPrompt = trimmedUserPrompt
    ? trimmedUserPrompt.includes("{{pageText}}")
      ? fillPromptTemplate(trimmedUserPrompt, { pageText })
      : `${trimmedUserPrompt}\n\n頁面內容：\n${pageText}`
    : pageText;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // Mark the system prompt as cacheable — it's identical for every page,
    // so after the first call subsequent ones read it from cache (~10% cost).
    system: [
      {
        type: "text",
        text: customSystemPrompt || SUMMARY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const block = message.content[0];
  if (block?.type === "text") {
    return block.text;
  }
  return "無法產生摘要";
}

export async function answerQuestionAboutPage(input: {
  pageText: string;
  selectedText: string;
  question: string;
  systemPrompt?: string;
  userPrompt?: string;
}) {
  const { pageText, selectedText, question, systemPrompt, userPrompt } = input;
  const finalUserPrompt = userPrompt?.trim()
    ? fillPromptTemplate(userPrompt, {
        pageText,
        selectedText,
        question,
      })
    : `講義頁面內容：\n${pageText}\n\n使用者選取文字：\n${selectedText}\n\n問題：\n${question}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text:
          systemPrompt?.trim() ||
          "你是一位專業的學術助理。請根據講義頁面內容與使用者選取的文字，用繁體中文回答問題。只能根據提供內容回答，不要編造。",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: finalUserPrompt.includes(pageText)
          ? finalUserPrompt
          : `${finalUserPrompt}\n\n講義頁面內容：\n${pageText}`,
      },
    ],
  });

  const block = message.content[0];
  if (block?.type === "text") {
    return block.text;
  }

  return "無法產生回答";
}

export type PromptSuggestionAnalysis = {
  topic: string;
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
    tone: pick(input.tone, ["concise", "detailed", "teaching"], "teaching"),
    summaryFormat: pick(
      input.summaryFormat,
      ["key-points", "bullets", "exam"],
      "key-points",
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
