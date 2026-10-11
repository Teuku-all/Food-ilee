/*
  Warnings:

  - Added the required column `reviewerId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wasteId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "reviewerId" TEXT NOT NULL,
ADD COLUMN     "wasteId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_wasteId_fkey" FOREIGN KEY ("wasteId") REFERENCES "WasteProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
