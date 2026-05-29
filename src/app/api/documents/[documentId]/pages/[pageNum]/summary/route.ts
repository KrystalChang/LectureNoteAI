import { prisma } from "@/lib/prisma";
import { summaryOnePage } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { documentId, pageNumber } = await request.json();

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
    if (result.summary) {
      return Response.json({ summary: result.summary, cached: true });
    }

    const summary = await summaryOnePage(result.extractedText);

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
