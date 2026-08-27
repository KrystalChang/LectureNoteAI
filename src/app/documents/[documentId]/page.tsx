import { prisma } from "@/lib/prisma";
import PdfViewerClient from "@/components/pdf_viewer_client";
import DocumentToolbar from "@/components/document_toolbar";
import Link from "next/link";
import { auth } from "@/auth";

type DocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { documentId } = await params;

  const session = await auth();

  // 只查得到「自己的」文件；別人的文件視為不存在，避免用 ID 猜測他人資料。
  const document = session?.user?.id
    ? await prisma.document.findFirst({
        where: { id: documentId, userId: session.user.id },
      })
    : null;

  if (!document) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-semibold">Document not found</h1>
        <p className="text-gray-500 mt-2">
          No document found with ID: {documentId}
        </p>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          ← Back to upload
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      <DocumentToolbar
        documentId={document.id}
        title={document.originalName}
        user={session?.user ?? null}
      />

      <div className="flex-1 min-h-0">
        <PdfViewerClient
          fileUrl={`/api/documents/${document.id}/file`}
          documentId={document.id}
        />
      </div>
    </main>
  );
}
