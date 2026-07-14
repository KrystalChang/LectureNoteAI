// Cloudflare R2 object storage (S3-compatible) for uploaded PDF files.
//
// PDFs never pass through our API routes as raw bytes:
// - Upload:   the browser PUTs directly to R2 via a presigned URL
//             (created by POST /api/upload/presign), bypassing Vercel's
//             ~4.5MB request-body limit.
// - Download: /api/documents/[id]/file 302-redirects to a short-lived
//             presigned GET URL after checking ownership.
//
// `Document.filePath` stores the R2 object KEY (e.g. "pdfs/<userId>/<uuid>.pdf"),
// not a filesystem path. Requires env vars R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY, R2_BUCKET — see docs/SETUP_R2.md.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 10 * 60; // presigned PUT: 10 minutes
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // presigned GET: 1 hour

let cachedClient: S3Client | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} — see docs/SETUP_R2.md`);
  }
  return value;
}

function getClient(): S3Client {
  if (!cachedClient) {
    const accountId = requireEnv("R2_ACCOUNT_ID");
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return cachedClient;
}

function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

/** Presigned URL the browser can PUT the PDF to directly. */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
}

/** Presigned URL the browser can GET the PDF from (react-pdf follows the 302). */
export async function createPresignedDownloadUrl(
  key: string,
  filename: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentType: "application/pdf",
    ResponseContentDisposition: `inline; filename="${encodeURIComponent(filename)}"`,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });
}

/** Object size in bytes, or null if the object doesn't exist. */
export async function getObjectSize(key: string): Promise<number | null> {
  try {
    const head = await getClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return head.ContentLength ?? 0;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Download the whole object into memory (used once at upload time for text extraction). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  if (!response.Body) {
    throw new Error(`R2 object ${key} has no body`);
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/** Best-effort delete; missing objects are not an error. */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? (error as { name?: string }).name : undefined;
  const status =
    "$metadata" in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode
      : undefined;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}
