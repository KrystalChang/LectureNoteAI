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
