import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const includeAll = requestUrl.searchParams.get("all") === "true";
    const parentIdParam = requestUrl.searchParams.get("parentId");
    const parentId = parentIdParam?.trim() || null;

    const folders = await prisma.folder.findMany({
      where: includeAll ? undefined : { parentId },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    return Response.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return Response.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

type CreateFolderRequest = {
  name: string;
  parentId?: string | null;
};

export async function POST(request: Request) {
  try {
    const { name, parentId }: CreateFolderRequest = await request.json();
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return Response.json(
        { error: "Folder name cannot be empty" },
        { status: 400 },
      );
    }

    if (parentId !== undefined && parentId !== null && typeof parentId !== "string") {
      return Response.json({ error: "Invalid parent folder ID" }, { status: 400 });
    }

    const normalizedParentId = parentId?.trim() || null;

    if (normalizedParentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: normalizedParentId },
        select: { id: true },
      });

      if (!parentFolder) {
        return Response.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const newFolder = await prisma.folder.create({
      data: {
        name: trimmedName,
        parentId: normalizedParentId,
      },
    });

    return Response.json({ folder: newFolder }, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return Response.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
