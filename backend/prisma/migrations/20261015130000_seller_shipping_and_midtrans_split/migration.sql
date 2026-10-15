ALTER TABLE "Store"
  ADD COLUMN "shippingOriginContactName" TEXT,
  ADD COLUMN "shippingOriginContactPhone" TEXT,
  ADD COLUMN "shippingOriginAddress" TEXT,
  ADD COLUMN "shippingOriginPostalCode" TEXT,
  ADD COLUMN "midtransMerchantId" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "sellerShippingOrigin" JSONB;
