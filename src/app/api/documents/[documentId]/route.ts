import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { documentId } = await params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
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
