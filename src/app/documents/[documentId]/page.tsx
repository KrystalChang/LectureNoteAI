import { prisma } from "@/lib/prisma";
import PdfViewer from "@/components/pdf_viewer";
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
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 shrink-0"
          >
            ← Back
          </Link>
          <h1 className="text-base font-medium truncate">
            {document.originalName}
          </h1>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <PdfViewer
          fileUrl={`/api/documents/${document.id}/file`}
          documentId={document.id}
        />
      </div>
    </main>
  );
}
