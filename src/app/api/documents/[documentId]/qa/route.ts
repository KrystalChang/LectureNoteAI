import { answerQuestionAboutPage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

type CreateQARequest = {
  pageNumber: number;
  question: string;
  selectedText: string;
};

type RouteParams = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;
    const { pageNumber, question, selectedText }: CreateQARequest =
      await request.json();

    if (!pageNumber || !question?.trim() || !selectedText?.trim()) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const page = await prisma.pageContent.findUnique({
      where: {
        documentId_pageNumber: {
          documentId,
          pageNumber,
        },
      },
      select: {
        extractedText: true,
      },
    });

    if (!page) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    const answer = await answerQuestionAboutPage({
      pageText: page.extractedText,
      selectedText,
      question,
    });

    const qaEntry = await prisma.qAEntry.create({
      data: {
        document: {
          connect: { id: documentId },
        },
        pageNumber,
        question,
        selectedText,
        answer,
      },
    });

    return Response.json({ answer, qaEntryId: qaEntry.id });
  } catch (error) {
    console.error("Error creating QA entry:", error);
    return Response.json(
      { error: "Failed to answer question" },
      { status: 500 },
    );
  }
}
