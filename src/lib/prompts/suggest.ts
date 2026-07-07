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
