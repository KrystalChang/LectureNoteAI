"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Group, Panel, Separator } from "react-resizable-panels";
import PageSummary from "./page_summary";
import PageQA from "./page_qa";
import PageNotes from "./page_notes";

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

type RightPanelTab = "summary" | "qa" | "notes";
type SelectedTextState = {
  pageNumber: number;
  text: string;
} | null;

export default function PdfViewer({ fileUrl, documentId }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<RightPanelTab>("summary");
  const [selectedText, setSelectedText] = useState<SelectedTextState>(null);
  const currentPageSelectedText =
    selectedText?.pageNumber === currentPage ? selectedText.text : "";
  // Map<pageNumber, DOM element> — populated via ref callbacks below.
  // We use a ref (not state) because changes shouldn't trigger re-renders.
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateCurrentPageFromScroll = useCallback(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    const rootCenterY = rootRect.top + rootRect.height / 2;
    let closestPage: number | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    pageRefs.current.forEach((el, pageNumber) => {
      const pageRect = el.getBoundingClientRect();
      const pageCenterY = pageRect.top + pageRect.height / 2;
      const distance = Math.abs(pageCenterY - rootCenterY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNumber;
      }
    });

    if (closestPage === null) return;
    const nextPage = closestPage;

    setCurrentPage((previousPage) =>
      previousPage === nextPage ? previousPage : nextPage,
    );
  }, []);

  useEffect(() => {
    if (numPages > 0) updateCurrentPageFromScroll();
  }, [numPages, updateCurrentPageFromScroll]);

  return (
    <Group orientation="horizontal" className="h-full">
      {/* Left panel — scrolling PDF */}
      <Panel defaultSize={60} minSize={30}>
        <div
          ref={scrollContainerRef}
          onScroll={updateCurrentPageFromScroll}
          onMouseUp={() => {
            const text = window.getSelection()?.toString().trim() ?? "";

            if (text) {
              setSelectedText({ pageNumber: currentPage, text });

              if (activeTab === "summary") {
                setActiveTab("qa");
              }
            }
          }}
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
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Page {currentPage}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("summary")}
                className={
                  activeTab === "summary" ? "font-semibold" : "text-gray-500"
                }
              >
                Summary
              </button>

              <button
                onClick={() => setActiveTab("qa")}
                className={
                  activeTab === "qa" ? "font-semibold" : "text-gray-500"
                }
              >
                Q&A
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={
                  activeTab === "notes" ? "font-semibold" : "text-gray-500"
                }
              >
                Notes
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeTab === "summary" && numPages > 0 && (
              <PageSummary
                key={currentPage}
                documentId={documentId}
                pageNumber={currentPage}
              />
            )}

            {activeTab === "qa" && (
              <PageQA
                key={currentPage}
                documentId={documentId}
                pageNumber={currentPage}
                selectedText={currentPageSelectedText}
              />
            )}

            {activeTab === "notes" && (
              <PageNotes
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
