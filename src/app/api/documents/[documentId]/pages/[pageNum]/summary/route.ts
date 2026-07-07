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

  // ---- Streaming response ----
  if (wantStream) {
    return ndjsonResponse(async (emit) => {
      if (cacheHit) {
        emit({ type: "meta", cached: true });
        emit({ type: "delta", text: page.summary });
        emit({ type: "done", imageBased: treatAsImage });
        return;
      }

      if (needImageButMissing) {
        // Ask the client to capture and resend the rendered page image.
        emit({ type: "needsImage", imageBased: true });
        return;
      }

      emit({ type: "meta", cached: false, imageBased: treatAsImage });
      const stream = streamSummaryOnePage(
        page.extractedText,
        systemPromptInput || undefined,
        userPromptInput || undefined,
        image,
      );

      let full = "";
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          full += event.delta.text;
          emit({ type: "delta", text: event.delta.text });
        }
      }

      const finalText = full.trim() || "無法產生摘要";
      await savePageSummary(documentId, pageNumber, finalText, promptHash);
      emit({ type: "done", imageBased: treatAsImage });
    });
  }

  // ---- Non-streaming response (background prefetch / export) ----
  if (cacheHit) {
    return Response.json({ summary: page.summary, cached: true });
  }
  if (needImageButMissing) {
    return Response.json({ needsImage: true, imageBased: true });
  }

  try {
    const summary = await summaryOnePage(
      page.extractedText,
      systemPromptInput || undefined,
      userPromptInput || undefined,
      image,
    );
    await savePageSummary(documentId, pageNumber, summary, promptHash);
    return Response.json({ summary, cached: false, imageBased: treatAsImage });
  } catch (error) {
    console.error("Error generating summary:", error);
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
