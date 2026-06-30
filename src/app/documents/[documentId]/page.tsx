import { prisma } from "@/lib/prisma";
import PdfViewerClient from "@/components/pdf_viewer_client";
import DocumentToolbar from "@/components/document_toolbar";
import Link from "next/link";

type DocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-semibold">Document not found</h1>
        <p className="text-gray-500 mt-2">
          No document found with ID: {documentId}
        </p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to upload
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      <DocumentToolbar documentId={document.id} title={document.originalName} />

      <div className="flex-1 min-h-0">
        <PdfViewerClient
          fileUrl={`/api/documents/${document.id}/file`}
          documentId={document.id}
        />
      </div>
    </main>
  );
}
