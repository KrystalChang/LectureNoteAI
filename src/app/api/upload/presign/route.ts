import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { createPresignedUploadUrl } from "@/lib/r2";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Step 1 of the upload flow: hand the browser a short-lived presigned PUT URL
 * so the PDF goes straight to R2 instead of through this serverless function
 * (Vercel caps request bodies at ~4.5MB; our PDFs go up to 50MB).
 *
 * The real size/type enforcement happens again in POST /api/upload (finalize),
 * which HEADs the uploaded object — the checks here just fail fast.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { filename, size, contentType } = (body ?? {}) as {
      filename?: unknown;
      size?: unknown;
      contentType?: unknown;
    };

    if (typeof filename !== "string" || !filename.trim()) {
      return Response.json({ error: "Missing filename" }, { status: 400 });
    }

    const isPdf =
      contentType === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return Response.json(
        { error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
      return Response.json({ error: "Missing file size" }, { status: 400 });
    }
    if (size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File exceeds 50MB limit" },
        { status: 400 },
      );
    }

    // Key is namespaced by user; the finalize route verifies this prefix so a
    // user can only register objects they were issued an upload URL for.
    const key = `pdfs/${userId}/${randomUUID()}.pdf`;
    const uploadUrl = await createPresignedUploadUrl(key, "application/pdf");

    return Response.json({ key, uploadUrl });
  } catch (error) {
    console.error("Error creating presigned upload URL:", error);
    return Response.json(
      { error: "Failed to prepare upload" },
      { status: 500 },
    );
  }
}
