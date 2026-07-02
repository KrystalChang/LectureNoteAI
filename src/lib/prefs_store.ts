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

const LIBRARY_SETTINGS_ID = "default";

function parsePreferences(json: string | null | undefined): PromptPreferences {
  if (!json) return DEFAULT_PROMPT_PREFERENCES;
  try {
    return mergePromptPreferences(JSON.parse(json));
  } catch {
    return DEFAULT_PROMPT_PREFERENCES;
  }
}

/** Library-wide general defaults; falls back to DEFAULT when unset. */
export async function getLibraryPreferences(): Promise<PromptPreferences> {
  const row = await prisma.librarySettings.findUnique({
    where: { id: LIBRARY_SETTINGS_ID },
    select: { preferencesJson: true },
  });
  return parsePreferences(row?.preferencesJson);
}

export async function saveLibraryPreferences(
  preferences: PromptPreferences,
): Promise<void> {
  const json = JSON.stringify(mergePromptPreferences(preferences));
  await prisma.librarySettings.upsert({
    where: { id: LIBRARY_SETTINGS_ID },
    update: { preferencesJson: json },
    create: { id: LIBRARY_SETTINGS_ID, preferencesJson: json },
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
  return own ?? (await getLibraryPreferences());
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
