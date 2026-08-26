import { getUserId } from "@/lib/auth_helpers";
import { getUserAiQuota } from "@/lib/ai_quota_limit";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quota = await getUserAiQuota(userId);
    return Response.json(
      { quota },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Error reading AI quota:", error);
    return Response.json(
      { error: "Failed to load AI quota" },
      { status: 500 },
    );
  }
}
