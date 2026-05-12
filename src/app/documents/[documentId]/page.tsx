import { prisma } from "@/lib/prisma";

type DocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

// type DocumentMetadata = {
//   documentId: string;
//   originalName: string;
//   storedFilename: string;
// };

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
    </main>
  );
}
