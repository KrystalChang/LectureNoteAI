import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { extractPageTexts } from "@/lib/pdf";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderIdValue = formData.get("folderId");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (folderIdValue !== null && typeof folderIdValue !== "string") {
      return Response.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const folderId = folderIdValue?.trim() || null;

    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true },
      });

      if (!folder) {
        return Response.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    if (file.type !== "application/pdf") {
      return Response.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File exceeds 50MB limit" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `${randomUUID()}.pdf`;
    const uploadDir = path.join(process.cwd(), "uploads");

    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const { pageCount, texts } = await extractPageTexts(buffer);

    const document = await prisma.document.create({
      data: {
        originalName: file.name,
        storedFilename: filename,
        filePath,
        totalPages: pageCount,
        folderId,
        pages: {
          create: texts.map((extractedText, index) => ({
            pageNumber: index + 1,
            extractedText,
          })),
        },
      },
    });

    return Response.json({
      documentId: document.id,
      originalName: document.originalName,
      storedFilename: document.storedFilename,
      totalPages: document.totalPages,
      folderId: document.folderId,
      extractedTexts: texts,
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);

    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
