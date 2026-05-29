import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
  baseURL: process.env["ANTHROPIC_BASE_URL"],
});

export async function summaryOnePage(pageText: string) {
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-4.6-sonnet",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `你是一位學術助理。請根據以下講義頁面內容，產生 3 到 5 個重點摘要。使用繁體中文，用條列式（bullet points）呈現。
          只根據提供的內容摘要，不要添加額外資訊。頁面內容：${pageText}`,
      },
    ],
  });
  const block = message.content[0];
  if (block.type === "text") {
    return block.text;
  }
  return "無法產生摘要";
}
