import { prisma } from "@/lib/prisma";
import { summaryOnePage } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { documentId, pageNumber, systemPrompt, userPrompt } =
      await request.json();
    const customSystemPrompt =
      typeof systemPrompt === "string" ? systemPrompt.trim() : "";
    const customUserPrompt =
      typeof userPrompt === "string" ? userPrompt.trim() : "";
    const hasCustomPrompt = Boolean(customSystemPrompt || customUserPrompt);

    const result = await prisma.pageContent.findFirst({
      where: {
        documentId: documentId,
        pageNumber: pageNumber,
      },
      select: {
        extractedText: true,
        summary: true,
      },
    });
    if (!result) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }
    if (result.summary && !hasCustomPrompt) {
      return Response.json({ summary: result.summary, cached: true });
    }

    const summary = await summaryOnePage(
      result.extractedText,
      customSystemPrompt,
      customUserPrompt,
    );

    if (hasCustomPrompt) {
      return Response.json({ summary, cached: false });
    }

    const updatedPage = await prisma.pageContent.update({
      where: {
        documentId_pageNumber: {
          documentId: documentId,
          pageNumber: pageNumber,
        },
      },
      data: {
        summary: summary,
      },
    });

    return Response.json({ summary: updatedPage.summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
