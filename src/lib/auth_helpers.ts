import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Auth helpers shared by API route handlers.
 *
 * Every route that touches user-owned data must (1) confirm there is a logged
 * in user, and (2) confirm the target resource belongs to that user. These
 * helpers centralise both checks so individual routes stay small and no route
 * silently forgets the ownership filter.
 */

/** The logged-in user's id, or null when the request is unauthenticated. */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * True when `documentId` exists AND belongs to `userId`. Routes should treat a
 * false result as 404 (not 403) so document ids can't be probed for existence.
 */
export async function userOwnsDocument(
  documentId: string,
  userId: string,
): Promise<boolean> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  });
  return doc !== null;
}
