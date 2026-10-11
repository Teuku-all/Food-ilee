-- DropForeignKey
ALTER TABLE "WasteProduct" DROP CONSTRAINT "WasteProduct_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "WasteProduct" DROP CONSTRAINT "WasteProduct_storeId_fkey";

-- AlterTable
ALTER TABLE "WasteProduct" ALTER COLUMN "price" SET DEFAULT 0,
ALTER COLUMN "sellerId" DROP NOT NULL,
ALTER COLUMN "storeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WasteProduct" ADD CONSTRAINT "WasteProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteProduct" ADD CONSTRAINT "WasteProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
