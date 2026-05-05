import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
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

    const document = await prisma.document.create({
      data: {
        originalName: file.name,
        storedFilename: filename,
        filePath,
      },
    });

    return Response.json({
      documentId: document.id,
      originalName: document.originalName,
      storedFilename: document.storedFilename,
    });
  } catch (error) {
    console.error(error);

    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
