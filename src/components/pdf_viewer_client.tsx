"use client";

import dynamic from "next/dynamic";

type PdfViewerClientProps = {
  fileUrl: string;
  documentId: string;
};

const PdfViewer = dynamic(() => import("./pdf_viewer"), {
  ssr: false,
  loading: () => <p className="p-6 text-gray-500">Loading PDF viewer...</p>,
});

export default function PdfViewerClient(props: PdfViewerClientProps) {
  return <PdfViewer {...props} />;
}
