import {
  answerQuestionAboutPage,
  parseImageDataUrl,
  streamAnswerAboutPage,
} from "@/lib/ai";
import { ndjsonResponse } from "@/lib/ndjson";
import { prisma } from "@/lib/prisma";
import { getUserId, userOwnsDocument } from "@/lib/auth_helpers";
import {
  AiQuotaLimitError,
  aiQuotaLimitResponse,
  incrementUserUsage,
  releaseUserUsage,
} from "@/lib/ai_quota_limit";

type CreateQARequest = {
  pageNumber: number;
  question: string;
  selectedText?: string;
  systemPrompt?: string;
  userPrompt?: string;
  image?: string;
  stream?: boolean;
};

type RouteParams = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { documentId } = await params;

  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userOwnsDocument(documentId, userId))) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const body: CreateQARequest = await request.json().catch(() => ({}) as CreateQARequest);
  const {
    pageNumber,
    question,
    selectedText,
    systemPrompt,
    userPrompt,
    stream: wantStream,
  } = body;

  const image = parseImageDataUrl(body.image);

  if (!pageNumber || !question?.trim()) {
    if (wantStream) {
      return ndjsonResponse(async (emit) =>
        emit({ type: "error", error: "Missing required fields" }),
      );
    }
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const page = await prisma.pageContent.findUnique({
    where: { documentId_pageNumber: { documentId, pageNumber } },
    select: { extractedText: true },
  });

  if (!page) {
    if (wantStream) {
      return ndjsonResponse(async (emit) =>
        emit({ type: "error", error: "Page not found" }),
      );
    }
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  const normalizedSelectedText =
    selectedText?.trim() || (image ? "（圈選圖片提問）" : "");
  const trimmedQuestion = question.trim();

  async function persist(answer: string) {
    return prisma.qAEntry.create({
      data: {
        document: { connect: { id: documentId } },
        pageNumber,
        question: trimmedQuestion,
        selectedText: normalizedSelectedText,
        answer,
      },
    });
  }

  let usage;
  try {
    usage = await incrementUserUsage(userId);
  } catch (error) {
    if (error instanceof AiQuotaLimitError) {
      return aiQuotaLimitResponse(error);
    }
    throw error;
  }

  // ---- Streaming response ----
  if (wantStream) {
    return ndjsonResponse(async (emit) => {
      let full = "";

      try {
        const aiStream = streamAnswerAboutPage({
          pageText: page.extractedText,
          selectedText: normalizedSelectedText,
          question: trimmedQuestion,
          systemPrompt,
          userPrompt,
          image,
        });

        for await (const delta of aiStream) {
          full += delta;
          emit({ type: "delta", text: delta });
        }
      } catch (error) {
        await releaseUserUsage(userId, usage.month);
        throw error;
      }

      const finalAnswer = full.trim() || "無法產生回答";
      const qaEntry = await persist(finalAnswer);
      emit({ type: "done", qaEntry, usage });
    });
  }

  // ---- Non-streaming response ----
  let answer: string;
  try {
    answer = await answerQuestionAboutPage({
      pageText: page.extractedText,
      selectedText: normalizedSelectedText,
      question: trimmedQuestion,
      systemPrompt,
      userPrompt,
      image,
    });
  } catch (error) {
    await releaseUserUsage(userId, usage.month);
    console.error("Error creating QA entry:", error);
    return Response.json(
      { error: "Failed to answer question" },
      { status: 500 },
    );
  }

  try {
    const qaEntry = await persist(answer);
    return Response.json({ qaEntry, usage });
  } catch (error) {
    console.error("Error saving QA entry:", error);
    return Response.json({ error: "Failed to save answer" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { documentId } = await params;

    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await userOwnsDocument(documentId, userId))) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const pageNumber = Number(searchParams.get("pageNumber"));

    if (!pageNumber) {
      return Response.json({ error: "Missing pageNumber" }, { status: 400 });
    }

    const qaEntries = await prisma.qAEntry.findMany({
      where: { documentId, pageNumber },
      orderBy: { createdAt: "asc" },
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
