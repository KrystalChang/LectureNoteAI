import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth_helpers";
import { createPresignedDownloadUrl } from "@/lib/r2";

type RouteContext = {
  params: Promise<{
    documentId: string;
  }>;
};

/**
 * Checks ownership, then 302-redirects to a short-lived presigned R2 URL so
 * the PDF bytes stream from R2 to the browser directly (never through this
 * function). react-pdf/pdfjs range requests re-hit this route and get a fresh
 * redirect each time — signing is a local HMAC, so this stays cheap.
 * Requires GET + Range CORS rules on the bucket (docs/SETUP_R2.md).
 */
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
    select: { filePath: true, originalName: true },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  // filePath holds the R2 object key for documents uploaded after the R2
  // migration (e.g. "pdfs/<userId>/<uuid>.pdf").
  const url = await createPresignedDownloadUrl(
    document.filePath,
    document.originalName,
  );

  return Response.redirect(url, 302);
}
