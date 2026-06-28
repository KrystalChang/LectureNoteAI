import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const folderIdParam = requestUrl.searchParams.get("folderId");
    const folderId = folderIdParam?.trim() || null;

    const documents = await prisma.document.findMany({
      where: {
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
