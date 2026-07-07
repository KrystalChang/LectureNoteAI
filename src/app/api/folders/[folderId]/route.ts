import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth_helpers";

type RouteContext = {
  params: Promise<{
    folderId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { folderId } = await params;
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const name = (body as Record<string, unknown>).name;
    if (typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "Folder name is required" }, { status: 400 });
    }

    const existingFolder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      select: { id: true },
    });

    if (!existingFolder) {
      return Response.json({ error: "Folder not found" }, { status: 404 });
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: { name: name.trim() },
    });

    return Response.json({ folder });
  } catch (error) {
    console.error("Error updating folder:", error);
    return Response.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { folderId } = await params;
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      select: { id: true },
    });

    if (!folder) {
      return Response.json({ error: "Folder not found" }, { status: 404 });
    }

    await prisma.folder.delete({ where: { id: folderId } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return Response.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
