import { prisma } from "@/lib/prisma";
import { getUserId, userOwnsDocument } from "@/lib/auth_helpers";

type RouteParams = {
  params: Promise<{
    documentId: string;
    pageNum: string;
  }>;
};

type UpdateNoteRequest = {
  content: string;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { documentId, pageNum } = await params;

    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await userOwnsDocument(documentId, userId))) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const pageNumber = Number(pageNum);
    const { content }: UpdateNoteRequest = await request.json();

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      typeof content !== "string"
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const note = await prisma.note.upsert({
      where: {
        documentId_pageNumber: {
          documentId,
          pageNumber,
        },
      },
      update: {
        content,
      },
      create: {
        documentId,
        pageNumber,
        content,
      },
    });

    return Response.json({ note });
  } catch (error) {
    console.error("Error saving note:", error);
    return Response.json({ error: "Failed to save note" }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { documentId, pageNum } = await params;

    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await userOwnsDocument(documentId, userId))) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    const pageNumber = Number(pageNum);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const note = await prisma.note.findUnique({
      where: {
        documentId_pageNumber: {
          documentId,
          pageNumber,
        },
      },
    });
    return Response.json({ note });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return Response.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}
