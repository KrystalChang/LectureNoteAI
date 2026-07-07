import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth_helpers";

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestUrl = new URL(request.url);
    const folderIdParam = requestUrl.searchParams.get("folderId");
    const folderId = folderIdParam?.trim() || null;

    const documents = await prisma.document.findMany({
      where: {
        userId,
        folderId,
      },
      select: {
        id: true,
        originalName: true,
        totalPages: true,
        uploadedAt: true,
        folderId: true,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return Response.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);

    return Response.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}
