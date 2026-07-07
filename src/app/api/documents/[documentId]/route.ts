import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth_helpers";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  return Response.json({
    documentId: document.id,
    originalName: document.originalName,
    storedFilename: document.storedFilename,
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const data: { originalName?: string; folderId?: string | null } = {};

    if ("originalName" in input) {
      if (typeof input.originalName !== "string" || !input.originalName.trim()) {
        return Response.json({ error: "Document name is required" }, { status: 400 });
      }

      const trimmedName = input.originalName.trim();
      data.originalName = trimmedName.toLowerCase().endsWith(".pdf")
        ? trimmedName
        : `${trimmedName}.pdf`;
    }

    if ("folderId" in input) {
      if (input.folderId !== null && typeof input.folderId !== "string") {
        return Response.json({ error: "Invalid folder ID" }, { status: 400 });
      }

      const folderId =
        typeof input.folderId === "string" && input.folderId.trim()
          ? input.folderId.trim()
          : null;

      if (folderId) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId },
          select: { id: true },
        });

        if (!folder) {
          return Response.json({ error: "Folder not found" }, { status: 404 });
        }
      }

      data.folderId = folderId;
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No changes provided" }, { status: 400 });
    }

    const existingDocument = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });

    if (!existingDocument) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data,
      select: {
        id: true,
        originalName: true,
        totalPages: true,
        uploadedAt: true,
        folderId: true,
      },
    });

    return Response.json({ document });
  } catch (error) {
    console.error("Error updating document:", error);
    return Response.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true, filePath: true },
    });

    if (!document) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.document.delete({ where: { id: documentId } });

    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      const code =
        fileError && typeof fileError === "object" && "code" in fileError
          ? fileError.code
          : undefined;

      if (code !== "ENOENT") {
        console.error("Failed to remove PDF file:", fileError);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return Response.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
