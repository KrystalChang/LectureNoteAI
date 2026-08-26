import { streamSummaryOnePage, summaryOnePage, parseImageDataUrl } from "@/lib/ai";
import { SUMMARY_SYSTEM_PROMPT } from "@/lib/prompts/summary";
import { ndjsonResponse } from "@/lib/ndjson";
import {
  computeSummaryPromptHash,
  getPageForSummary,
  isLikelyImagePage,
  savePageSummary,
} from "@/lib/page_store";
import { getUserId, userOwnsDocument } from "@/lib/auth_helpers";
import {
  AiQuotaLimitError,
  aiQuotaLimitResponse,
  incrementUserUsage,
  releaseUserUsage,
} from "@/lib/ai_quota_limit";

type RouteParams = {
  params: Promise<{
    documentId: string;
    pageNum: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { documentId, pageNum } = await params;

  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userOwnsDocument(documentId, userId))) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  const pageNumber = Number(pageNum) || Number(body?.pageNumber);
  const wantStream = body?.stream === true;
  const systemPromptInput =
    typeof body?.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  const userPromptInput =
    typeof body?.userPrompt === "string" ? body.userPrompt.trim() : "";
  const image = parseImageDataUrl(body?.image);

  if (!documentId || !Number.isInteger(pageNumber) || pageNumber < 1) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const page = await getPageForSummary(documentId, pageNumber);
  if (!page) {
    if (wantStream) {
      return ndjsonResponse(async (emit) =>
        emit({ type: "error", error: "Page not found" }),
      );
    }
    return Response.json({ error: "Page not found" }, { status: 404 });
  }

  const effectiveSystem = systemPromptInput || SUMMARY_SYSTEM_PROMPT;
  const effectiveUserForHash = userPromptInput || "(default)";
  // image-vs-text decision is deterministic per page, so the cache key is
  // stable across revisits.
  const treatAsImage = page.isImageBased || isLikelyImagePage(page.extractedText);
  const promptHash = computeSummaryPromptHash({
    systemPrompt: effectiveSystem,
    userPrompt: effectiveUserForHash,
    usedImage: treatAsImage,
  });

  const cacheHit = Boolean(page.summary) && page.summaryPromptHash === promptHash;
  const needImageButMissing = treatAsImage && !image;

  if (cacheHit) {
    if (wantStream) {
      return ndjsonResponse(async (emit) => {
        emit({ type: "meta", cached: true });
        emit({ type: "delta", text: page.summary });
        emit({ type: "done", imageBased: treatAsImage });
      });
    }
    return Response.json({ summary: page.summary, cached: true });
  }

  if (needImageButMissing) {
    if (wantStream) {
      return ndjsonResponse(async (emit) => {
        emit({ type: "needsImage", imageBased: true });
      });
    }
    return Response.json({ needsImage: true, imageBased: true });
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
      emit({ type: "meta", cached: false, imageBased: treatAsImage });
      let full = "";

      try {
        const stream = streamSummaryOnePage(
          page.extractedText,
          systemPromptInput || undefined,
          userPromptInput || undefined,
          image,
        );

        for await (const delta of stream) {
          full += delta;
          emit({ type: "delta", text: delta });
        }
      } catch (error) {
        await releaseUserUsage(userId, usage.month);
        throw error;
      }

      const finalText = full.trim() || "無法產生摘要";
      await savePageSummary(documentId, pageNumber, finalText, promptHash);
      emit({ type: "done", imageBased: treatAsImage, usage });
    });
  }

  // ---- Non-streaming response (background prefetch / export) ----
  let summary: string;
  try {
    summary = await summaryOnePage(
      page.extractedText,
      systemPromptInput || undefined,
      userPromptInput || undefined,
      image,
    );
  } catch (error) {
    await releaseUserUsage(userId, usage.month);
    console.error("Error generating summary:", error);
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }

  try {
    await savePageSummary(documentId, pageNumber, summary, promptHash);
    return Response.json({
      summary,
      cached: false,
      imageBased: treatAsImage,
      usage,
    });
  } catch (error) {
    console.error("Error saving summary:", error);
    return Response.json({ error: "Failed to save summary" }, { status: 500 });
  }
}
