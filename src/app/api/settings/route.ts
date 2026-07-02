import {
  getLibraryPreferences,
  saveLibraryPreferences,
} from "@/lib/prefs_store";
import { mergePromptPreferences } from "@/lib/prompt_preferences";

export async function GET() {
  try {
    const preferences = await getLibraryPreferences();
    return Response.json({ preferences });
  } catch (error) {
    console.error("Error reading library settings:", error);
    return Response.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const input = body as { preferences?: unknown };
    const preferences = mergePromptPreferences(input.preferences);
    await saveLibraryPreferences(preferences);

    return Response.json({ preferences });
  } catch (error) {
    console.error("Error saving library settings:", error);
    return Response.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
