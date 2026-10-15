ALTER TABLE "Store"
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankAccountHolder" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "sellerSettlementAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sellerSettlementStatus" TEXT NOT NULL DEFAULT 'not_applicable';
