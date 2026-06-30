import { answerQuestionAboutPage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

type CreateQARequest = {
  pageNumber: number;
  question: string;
  selectedText?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type RouteParams = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;
    const {
      pageNumber,
      question,
      selectedText,
      systemPrompt,
      userPrompt,
    }: CreateQARequest = await request.json();

    if (!pageNumber || !question?.trim()) {
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

    const normalizedSelectedText = selectedText?.trim() ?? "";

    const answer = await answerQuestionAboutPage({
      pageText: page.extractedText,
      selectedText: normalizedSelectedText,
      question: question.trim(),
      systemPrompt,
      userPrompt,
    });

    const qaEntry = await prisma.qAEntry.create({
      data: {
        document: {
          connect: { id: documentId },
        },
        pageNumber,
        question: question.trim(),
        selectedText: normalizedSelectedText,
        answer,
      },
    });

    return Response.json({ qaEntry });
  } catch (error) {
    console.error("Error creating QA entry:", error);
    return Response.json(
      { error: "Failed to answer question" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(request.url);
    const pageNumber = Number(searchParams.get("pageNumber"));

    if (!pageNumber) {
      return Response.json({ error: "Missing pageNumber" }, { status: 400 });
    }

    const qaEntries = await prisma.qAEntry.findMany({
      where: {
        documentId,
        pageNumber,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return Response.json({ qaEntries });
  } catch (error) {
    console.error("Error fetching QA history:", error);
    return Response.json(
      { error: "Failed to fetch QA history" },
      { status: 500 },
    );
  }
}
