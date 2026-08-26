import { createHash } from "crypto";
import { prisma } from "./prisma";
import { AI_MODEL, AI_PROVIDER } from "./ai";

/**
 * Page-level reads/writes for summaries and the image-based flag.
 *
 * These use the typed Prisma client. The `summaryPromptHash` and
 * `isImageBased` columns live on PageContent in schema.prisma; run
 * `npx prisma db push` on the Mac (regenerates the client) after schema changes.
 */

const TEXT_THRESHOLD = 12; // trimmed chars below this ⇒ treat page as image-based

export function isLikelyImagePage(extractedText: string): boolean {
  return extractedText.trim().length < TEXT_THRESHOLD;
}

/** Stable hash of the inputs that determine a summary, for cache validation. */
export function computeSummaryPromptHash(input: {
  systemPrompt: string;
  userPrompt: string;
  usedImage: boolean;
}): string {
  return createHash("sha256")
    .update(
      [
        AI_PROVIDER,
        AI_MODEL,
        input.systemPrompt,
        input.userPrompt,
        `img:${input.usedImage ? 1 : 0}`,
        "v2",
      ].join(" "),
    )
    .digest("hex");
}

export type PageSummaryRow = {
  extractedText: string;
  summary: string | null;
  summaryPromptHash: string | null;
  isImageBased: boolean;
};

export async function getPageForSummary(
  documentId: string,
  pageNumber: number,
): Promise<PageSummaryRow | null> {
  return prisma.pageContent.findUnique({
    where: { documentId_pageNumber: { documentId, pageNumber } },
    select: {
      extractedText: true,
      summary: true,
      summaryPromptHash: true,
      isImageBased: true,
    },
  });
}

export async function savePageSummary(
  documentId: string,
  pageNumber: number,
  summary: string,
  promptHash: string,
): Promise<void> {
  await prisma.pageContent.update({
    where: { documentId_pageNumber: { documentId, pageNumber } },
    data: { summary, summaryPromptHash: promptHash },
  });
}

/** Mark the given 1-based page numbers as image-based after upload. */
export async function markImageBasedPages(
  documentId: string,
  pageNumbers: number[],
): Promise<void> {
  if (pageNumbers.length === 0) return;
  await prisma.pageContent.updateMany({
    where: { documentId, pageNumber: { in: pageNumbers } },
    data: { isImageBased: true },
  });
}

export type ExportPageRow = {
  pageNumber: number;
  extractedText: string;
  summary: string | null;
  isImageBased: boolean;
};

export async function getPagesForExport(
  documentId: string,
): Promise<ExportPageRow[]> {
  return prisma.pageContent.findMany({
    where: { documentId },
    select: {
      pageNumber: true,
      extractedText: true,
      summary: true,
      isImageBased: true,
    },
    orderBy: { pageNumber: "asc" },
  });
}
