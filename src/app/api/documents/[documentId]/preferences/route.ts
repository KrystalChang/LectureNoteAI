import { prisma } from "@/lib/prisma";
import {
  getDocumentPreferences,
  getLibraryPreferences,
  saveDocumentPreferences,
} from "@/lib/prefs_store";
import { mergePromptPreferences } from "@/lib/prompt_preferences";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!document) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const own = await getDocumentPreferences(documentId);
    const preferences = own ?? (await getLibraryPreferences());

    return Response.json({
      preferences,
      hasOwnPreferences: own !== null,
    });
  } catch (error) {
    console.error("Error reading document preferences:", error);
    return Response.json(
      { error: "Failed to load document preferences" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!document) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const input = body as { preferences?: unknown };
    const preferences = mergePromptPreferences(input.preferences);
    await saveDocumentPreferences(documentId, preferences);

    return Response.json({ preferences, hasOwnPreferences: true });
  } catch (error) {
    console.error("Error saving document preferences:", error);
    return Response.json(
      { error: "Failed to save document preferences" },
      { status: 500 },
    );
  }
}
