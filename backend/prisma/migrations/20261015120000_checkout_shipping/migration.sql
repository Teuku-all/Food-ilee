ALTER TABLE "Order"
  ADD COLUMN "subtotal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingCost" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippingAddress" JSONB,
  ADD COLUMN "courier" TEXT,
  ADD COLUMN "courierService" TEXT,
  ADD COLUMN "biteshipOrderId" TEXT,
  ADD COLUMN "trackingNumber" TEXT,
  ADD COLUMN "trackingUrl" TEXT,
  ADD COLUMN "shippingStatus" TEXT;

UPDATE "Order" SET "subtotal" = "total" WHERE "subtotal" = 0;
CREATE UNIQUE INDEX "Order_biteshipOrderId_key" ON "Order"("biteshipOrderId");

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "wasteId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "image" TEXT,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_wasteId_fkey" FOREIGN KEY ("wasteId") REFERENCES "WasteProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "OrderItem" ("id", "orderId", "wasteId", "title", "unitPrice", "quantity", "image")
SELECT 'legacy-' || o."id", o."id", o."wasteId", w."title", w."price", o."quantity", w."image"
FROM "Order" o JOIN "WasteProduct" w ON w."id" = o."wasteId";
ALTER TABLE "Order" ADD COLUMN "courierServiceName" TEXT;
ALTER TABLE "Order" ADD COLUMN "checkoutKey" TEXT;
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
