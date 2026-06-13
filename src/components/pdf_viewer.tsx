"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Group, Panel, Separator } from "react-resizable-panels";
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
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Map<pageNumber, DOM element> — populated via ref callbacks below.
  // We use a ref (not state) because changes shouldn't trigger re-renders.
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect which page is currently in view using IntersectionObserver.
  // Whichever page wrapper has the largest visible ratio "wins" and
  // becomes currentPage — that drives the right panel's summary.
  useEffect(() => {
    if (numPages === 0) return;
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const page = Number(
            (visible.target as HTMLElement).dataset.page ?? 0,
          );
          if (page > 0) setCurrentPage(page);
        }
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages]);

  return (
    <Group orientation="horizontal" className="h-full">
      {/* Left panel — scrolling PDF */}
      <Panel defaultSize={60} minSize={30}>
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto bg-gray-100"
        >
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p className="p-6 text-gray-500">Loading PDF...</p>}
            error={<p className="p-6 text-red-600">Failed to load PDF.</p>}
          >
            {Array.from(new Array(numPages), (_, index) => {
              const pageNumber = index + 1;
              return (
                <div
                  key={`page_${pageNumber}`}
                  data-page={pageNumber}
                  ref={(el) => {
                    if (el) pageRefs.current.set(pageNumber, el);
                    else pageRefs.current.delete(pageNumber);
                  }}
                  className="mx-auto my-6 w-fit bg-white shadow-md"
                >
                  <Page
                    pageNumber={pageNumber}
                    width={800}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                  <p className="text-center text-xs text-gray-500 py-2">
                    Page {pageNumber} / {numPages}
                  </p>
                </div>
              );
            })}
          </Document>
        </div>
      </Panel>

      {/* Drag handle — the thin grey strip in between */}
      <Separator className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

      {/* Right panel — summary for the currently-visible page */}
      <Panel defaultSize={40} minSize={25}>
        <aside className="h-full flex flex-col bg-white border-l border-gray-200">
          <header className="px-4 py-3 border-b border-gray-200 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">
              Summary — Page {currentPage}
            </h2>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {numPages > 0 && (
              <PageSummary
                key={currentPage}
                documentId={documentId}
                pageNumber={currentPage}
              />
            )}
          </div>
        </aside>
      </Panel>
    </Group>
  );
}
