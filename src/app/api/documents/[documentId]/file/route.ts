import fs from "fs/promises";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const fileBuffer = await fs.readFile(document.filePath);

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
    },
  });
}
