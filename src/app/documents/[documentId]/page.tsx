type DocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

type DocumentMetadata = {
  documentId: string;
  originalName: string;
  storedFilename: string;
};

async function getDocument(documentId: string): Promise<DocumentMetadata> {
  const res = await fetch(`http://localhost:3000/api/documents/${documentId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch document metadata");
  }

  return res.json();
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { documentId } = await params;
  const document = await getDocument(documentId);

  return (
    <main style={{ padding: 40 }}>
      <h1>Document: {document.originalName}</h1>
      <p>Document ID: {document.documentId}</p>
      <p>Stored Filename: {document.storedFilename}</p>
    </main>
  );
}
