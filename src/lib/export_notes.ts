import { prisma } from "./prisma";
import { summaryOnePage } from "./ai";
import { SUMMARY_SYSTEM_PROMPT } from "./prompts/summary";
import {
  DEFAULT_PROMPT_PREFERENCES,
  buildSummaryPrompt,
} from "./prompt_preferences";
import {
  computeSummaryPromptHash,
  getPagesForExport,
  isLikelyImagePage,
  savePageSummary,
} from "./page_store";
import {
  incrementUserUsage,
  releaseUserUsage,
} from "./ai_quota_limit";

export type CompiledPage = {
  pageNumber: number;
  isImageBased: boolean;
  summary: string | null;
  note: string | null;
  placeholder: boolean;
};

export type CompiledNotes = {
  title: string;
  generatedAt: string;
  pages: CompiledPage[];
};

export const IMAGE_PLACEHOLDER =
  "（本頁以圖片為主，AI 圖片摘要需在閱讀頁面時即時產生；此處未包含。）";

export async function compileNotes(
  documentId: string,
  userId: string,
): Promise<CompiledNotes | null> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { originalName: true },
  });
  if (!document) return null;

  const [pages, notes] = await Promise.all([
    getPagesForExport(documentId),
    prisma.note.findMany({
      where: { documentId },
      select: { pageNumber: true, content: true },
    }),
  ]);

  const noteByPage = new Map(notes.map((n) => [n.pageNumber, n.content]));
  const { systemPrompt, userPrompt } = buildSummaryPrompt(
    DEFAULT_PROMPT_PREFERENCES,
  );

  const compiledPages: CompiledPage[] = [];
  for (const page of pages) {
    const imageBased = page.isImageBased || isLikelyImagePage(page.extractedText);
    let summary = page.summary;
    let placeholder = false;

    if (!summary) {
      if (imageBased) {
        // Can't run vision server-side here; leave a placeholder so the export
        // stays fast and we don't pollute the cache with a weak text summary.
        placeholder = true;
      } else {
        const usage = await incrementUserUsage(userId);
        try {
          summary = await summaryOnePage(
            page.extractedText,
            systemPrompt,
            userPrompt,
          );
        } catch (error) {
          await releaseUserUsage(userId, usage.month);
          throw error;
        }
        const hash = computeSummaryPromptHash({
          systemPrompt: systemPrompt || SUMMARY_SYSTEM_PROMPT,
          userPrompt: userPrompt || "(default)",
          usedImage: false,
        });
        await savePageSummary(documentId, page.pageNumber, summary, hash);
      }
    }

    const note = noteByPage.get(page.pageNumber)?.trim() || null;
    compiledPages.push({
      pageNumber: page.pageNumber,
      isImageBased: imageBased,
      summary: summary ?? null,
      note,
      placeholder,
    });
  }

  return {
    title: document.originalName.replace(/\.pdf$/i, ""),
    generatedAt: new Date().toISOString(),
    pages: compiledPages,
  };
}

export function notesToMarkdown(compiled: CompiledNotes): string {
  const date = new Date(compiled.generatedAt).toLocaleString("zh-TW");
  const parts: string[] = [
    `# ${compiled.title} — 筆記`,
    `> 由 LectureNoteAI 於 ${date} 整理`,
    "",
  ];

  for (const page of compiled.pages) {
    parts.push(`## 第 ${page.pageNumber} 頁`);
    parts.push(page.summary || (page.placeholder ? IMAGE_PLACEHOLDER : "（無摘要）"));
    if (page.note) {
      parts.push("", "**我的筆記**", page.note);
    }
    parts.push("");
  }

  return parts.join("\n");
}
