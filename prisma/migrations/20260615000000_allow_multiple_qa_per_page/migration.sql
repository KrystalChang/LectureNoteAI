-- Drop the old uniqueness rule so a page can keep multiple Q&A entries.
DROP INDEX "QAEntry_documentId_pageNumber_key";

-- Keep a normal lookup index for fetching history by document and page.
CREATE INDEX "QAEntry_documentId_pageNumber_idx" ON "QAEntry"("documentId", "pageNumber");
