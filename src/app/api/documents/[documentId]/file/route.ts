import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth_helpers";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      userId,
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
