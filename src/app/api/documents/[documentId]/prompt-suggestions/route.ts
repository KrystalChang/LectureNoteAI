import { suggestPromptPreferencesFromDocument } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { PromptPreferences } from "@/lib/prompt_preferences";
import { getUserId } from "@/lib/auth_helpers";
import {
  AiQuotaLimitError,
  aiQuotaLimitResponse,
  incrementUserUsage,
  releaseUserUsage,
} from "@/lib/ai_quota_limit";

type RouteParams = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        originalName: true,
        pages: {
          select: {
            pageNumber: true,
            extractedText: true,
          },
          orderBy: {
            pageNumber: "asc",
          },
          take: 5,
        },
      },
    });

    if (!document) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const usage = await incrementUserUsage(userId);
    let analysis;
    try {
      analysis = await suggestPromptPreferencesFromDocument({
        documentName: document.originalName,
        pages: document.pages,
      });
    } catch (error) {
      await releaseUserUsage(userId, usage.month);
      throw error;
    }

    const preferences: Partial<PromptPreferences> = {
      documentFormat: analysis.documentFormat,
      tone: analysis.tone,
      language: "zh-TW",
      summaryFormat: analysis.summaryFormat,
      extraInstructions: buildExtraInstructions(analysis),
      useCustomSummaryPrompt: false,
      useCustomQAPrompt: false,
    };

    return Response.json({
      preferences,
      reason: buildReason(document.originalName, analysis),
      topic: analysis.topic,
      usage,
    });
  } catch (error) {
    if (error instanceof AiQuotaLimitError) {
      return aiQuotaLimitResponse(error);
    }
    console.error("Error suggesting prompt preferences:", error);
    return Response.json(
      { error: "Failed to suggest prompt settings" },
      { status: 500 },
    );
  }
}

type DocumentAnalysis = {
  topic: string;
  extraInstructions: string;
  hasDenseTechnicalContent: boolean;
  looksExamOrLecture: boolean;
  hasMathContent: boolean;
  hasCodeContent: boolean;
  reason: string;
};

function buildExtraInstructions(analysis: DocumentAnalysis) {
  const instructions = [
    analysis.extraInstructions,
    "請一律使用繁體中文回答；遇到重要英文術語時，保留英文並補充中文解釋。",
  ];

  if (analysis.hasMathContent) {
    instructions.push("遇到公式時，請說明每個符號代表什麼。");
  }
  if (analysis.hasCodeContent) {
    instructions.push("遇到程式碼或流程時，請用步驟拆解邏輯。");
  }
  if (analysis.looksExamOrLecture) {
    instructions.push("請特別標出可能的考點、定義與容易混淆處。");
  }

  return Array.from(
    new Set(instructions.map((instruction) => instruction.trim()).filter(Boolean)),
  ).join("\n");
}

function buildReason(documentName: string, analysis: DocumentAnalysis) {
  const signals = [`主題判斷為「${analysis.topic}」`];

  if (analysis.hasDenseTechnicalContent) signals.push("內容偏技術或學術");
  if (analysis.hasMathContent) signals.push("包含公式或數學概念");
  if (analysis.hasCodeContent) signals.push("包含程式碼或流程");
  if (analysis.looksExamOrLecture) signals.push("適合整理成考試重點");

  return `根據「${documentName}」前五頁內容，${signals.join("、")}。${analysis.reason}`;
}
