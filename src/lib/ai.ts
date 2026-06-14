import { Anthropic } from "@anthropic-ai/sdk";
import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
  baseURL: process.env["ANTHROPIC_BASE_URL"],
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function summaryOnePage(pageText: string) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // Mark the system prompt as cacheable — it's identical for every page,
    // so after the first call subsequent ones read it from cache (~10% cost).
    system: [
      {
        type: "text",
        text: SUMMARY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: pageText,
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
}) {
  const { pageText, selectedText, question } = input;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: "你是一位專業的學術助理。請根據講義頁面內容與使用者選取的文字，用繁體中文回答問題。只能根據提供內容回答，不要編造。",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `講義頁面內容：\n${pageText}\n\n使用者選取文字：\n${selectedText}\n\n問題：\n${question}`,
      },
    ],
  });

  const block = message.content[0];
  if (block?.type === "text") {
    return block.text;
  }

  return "無法產生回答";
}
