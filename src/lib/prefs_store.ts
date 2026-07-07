import { prisma } from "./prisma";
import {
  DEFAULT_PROMPT_PREFERENCES,
  PromptPreferences,
  mergePromptPreferences,
} from "./prompt_preferences";

/**
 * Prompt-preferences persistence.
 *
 * The library-wide defaults (`LibrarySettings`) and each document's snapshot
 * (`Document.promptPreferences`) are read/written through the typed Prisma
 * client. Both were added to schema.prisma, so run `npx prisma db push` on the
 * Mac (which regenerates the client) before these types resolve.
 */

function parsePreferences(json: string | null | undefined): PromptPreferences {
  if (!json) return DEFAULT_PROMPT_PREFERENCES;
  try {
    return mergePromptPreferences(JSON.parse(json));
  } catch {
    return DEFAULT_PROMPT_PREFERENCES;
  }
}

/** A user's general defaults; falls back to DEFAULT when unset. */
export async function getLibraryPreferences(
  userId: string,
): Promise<PromptPreferences> {
  const row = await prisma.librarySettings.findUnique({
    where: { userId },
    select: { preferencesJson: true },
  });
  return parsePreferences(row?.preferencesJson);
}

export async function saveLibraryPreferences(
  userId: string,
  preferences: PromptPreferences,
): Promise<void> {
  const json = JSON.stringify(mergePromptPreferences(preferences));
  await prisma.librarySettings.upsert({
    where: { userId },
    update: { preferencesJson: json },
    create: { userId, preferencesJson: json },
  });
}

/** Serialises preferences for storage on a Document row. */
export function serializePreferences(preferences: PromptPreferences): string {
  return JSON.stringify(mergePromptPreferences(preferences));
}

/**
 * A document's own preferences. Returns null when the document has never been
 * customised (so callers can fall back to the library defaults).
 */
export async function getDocumentPreferences(
  documentId: string,
): Promise<PromptPreferences | null> {
  const row = await prisma.document.findUnique({
    where: { id: documentId },
    select: { promptPreferences: true },
  });
  if (!row?.promptPreferences) return null;
  return parsePreferences(row.promptPreferences);
}

/**
 * A document's effective preferences: its own snapshot if present, otherwise
 * the current library defaults.
 */
export async function getEffectiveDocumentPreferences(
  documentId: string,
): Promise<PromptPreferences> {
  const own = await getDocumentPreferences(documentId);
  if (own) return own;
  // Fall back to the document owner's library defaults.
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true },
  });
  if (!doc) return DEFAULT_PROMPT_PREFERENCES;
  return getLibraryPreferences(doc.userId);
}

export async function saveDocumentPreferences(
  documentId: string,
  preferences: PromptPreferences,
): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { promptPreferences: serializePreferences(preferences) },
  });
}
