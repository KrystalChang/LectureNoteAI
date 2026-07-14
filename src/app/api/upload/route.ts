import path from "path";
import { prisma } from "@/lib/prisma";
import { extractPageTexts } from "@/lib/pdf";
import { isLikelyImagePage, markImageBasedPages } from "@/lib/page_store";
import {
  getLibraryPreferences,
  serializePreferences,
} from "@/lib/prefs_store";
import { mergePromptPreferences } from "@/lib/prompt_preferences";
import { auth } from "@/auth";
import { deleteObject, getObjectBuffer, getObjectSize } from "@/lib/r2";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Step 2 of the upload flow (finalize). By the time this runs, the browser has
 * already PUT the PDF straight to R2 using the presigned URL from
 * POST /api/upload/presign. This route verifies the object, downloads it once
 * to extract per-page text, and creates the Document row with
 * `filePath` = the R2 object key.
 *
 * Body: { key, originalName, folderId?, promptPreferences? } as JSON.
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

    const { key, originalName, folderId: folderIdValue, promptPreferences } =
      (body ?? {}) as {
        key?: unknown;
        originalName?: unknown;
        folderId?: unknown;
        promptPreferences?: unknown;
      };

    // Only accept keys under this user's own prefix, in the exact shape the
    // presign route issues — prevents registering someone else's object.
    const keyPattern = new RegExp(
      `^pdfs/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$`,
    );
    if (typeof key !== "string" || !keyPattern.test(key)) {
      return Response.json({ error: "Invalid upload key" }, { status: 400 });
    }

    if (typeof originalName !== "string" || !originalName.trim()) {
      return Response.json({ error: "Missing original filename" }, { status: 400 });
    }

    if (folderIdValue != null && typeof folderIdValue !== "string") {
      return Response.json({ error: "Invalid folder ID" }, { status: 400 });
    }
    const folderId =
      typeof folderIdValue === "string" ? folderIdValue.trim() || null : null;

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
        select: { id: true },
      });

      if (!folder) {
        return Response.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    // Prompt preferences for this document: the ones chosen in the upload
    // dialog if provided, otherwise the current library defaults. Saved as a
    // per-document snapshot so later changes to library defaults don't silently
    // rewrite existing documents.
    let documentPreferences = await getLibraryPreferences(userId);
    if (typeof promptPreferences === "string" && promptPreferences.trim()) {
      try {
        documentPreferences = mergePromptPreferences(
          JSON.parse(promptPreferences),
        );
      } catch {
        // Ignore malformed input and keep the library defaults.
      }
    }

    // Verify the object actually landed in R2 and re-enforce the size limit
    // server-side (the presign check trusted the client-declared size).
    const objectSize = await getObjectSize(key);
    if (objectSize === null) {
      return Response.json(
        { error: "Uploaded file not found — please try again" },
        { status: 400 },
      );
    }
    if (objectSize > MAX_FILE_SIZE) {
      await deleteObject(key);
      return Response.json(
        { error: "File exceeds 50MB limit" },
        { status: 400 },
      );
    }

    const buffer = await getObjectBuffer(key);
    const { pageCount, texts } = await extractPageTexts(buffer);

    const document = await prisma.document.create({
      data: {
        originalName,
        storedFilename: path.posix.basename(key),
        filePath: key, // R2 object key, not a filesystem path
        totalPages: pageCount,
        folderId,
        userId,
        promptPreferences: serializePreferences(documentPreferences),
        pages: {
          create: texts.map((extractedText, index) => ({
            pageNumber: index + 1,
            extractedText,
          })),
        },
      },
    });

    // Flag image-dominant / text-empty pages so the client knows to send a
    // rendered page image for a vision summary instead of empty text.
    const imageBasedPages = texts
      .map((text, index) => ({ text, pageNumber: index + 1 }))
      .filter(({ text }) => isLikelyImagePage(text))
      .map(({ pageNumber }) => pageNumber);
    if (imageBasedPages.length > 0) {
      await markImageBasedPages(document.id, imageBasedPages);
    }

    return Response.json({
      documentId: document.id,
      originalName: document.originalName,
      storedFilename: document.storedFilename,
      totalPages: document.totalPages,
      folderId: document.folderId,
      extractedTexts: texts,
    });
  } catch (error) {
    console.error("Error finalizing PDF upload:", error);

    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
