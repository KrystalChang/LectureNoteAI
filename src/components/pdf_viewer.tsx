"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import PageSummary from "./page_summary";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfViewerProps = {
  fileUrl: string;
  documentId: string;
};

export default function PdfViewer({ fileUrl, documentId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: "#f3f4f6" }}>
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p>Loading PDF...</p>}
        error={<p>Failed to load PDF.</p>}
      >
        {Array.from(new Array(numPages), (_, index) => (
          <div
            key={`page_${index + 1}`}
            style={{
              display: "flex",
              margin: "24px auto",
              padding: "16px",
              background: "white",
              width: "fit-content",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            <Page
              pageNumber={index + 1}
              width={800}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />

            <p style={{ textAlign: "center", marginTop: 8 }}>
              Page {index + 1} / {numPages}
            </p>
            <PageSummary documentId={documentId} pageNumber={index + 1} />
          </div>
        ))}
      </Document>
    </div>
  );
}
