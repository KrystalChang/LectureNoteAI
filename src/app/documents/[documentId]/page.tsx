import { prisma } from "@/lib/prisma";
import PdfViewer from "@/components/pdf_viewer";

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
      <main style={{ padding: 40 }}>
        <h1>Document not found</h1>
        <p>No document found with ID: {documentId}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Document: {document.originalName}</h1>
      <p>Document ID: {document.id}</p>
      <p>Stored Filename: {document.storedFilename}</p>
      <PdfViewer
        fileUrl={`/api/documents/${document.id}/file`}
        documentId={document.id}
      />
    </main>
  );
}
