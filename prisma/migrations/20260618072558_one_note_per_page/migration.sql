/*
  Warnings:

  - A unique constraint covering the columns `[documentId,pageNumber]` on the table `Note` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Note_documentId_pageNumber_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Note_documentId_pageNumber_key" ON "Note"("documentId", "pageNumber");
