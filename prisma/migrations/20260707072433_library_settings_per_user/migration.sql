/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `LibrarySettings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `LibrarySettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LibrarySettings" ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "LibrarySettings_userId_key" ON "LibrarySettings"("userId");

-- AddForeignKey
ALTER TABLE "LibrarySettings" ADD CONSTRAINT "LibrarySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
