ALTER TABLE "Order"
  ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'midtrans',
  ADD COLUMN "codAmount" INTEGER;
