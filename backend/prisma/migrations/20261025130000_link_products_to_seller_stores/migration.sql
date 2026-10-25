UPDATE "WasteProduct" AS product
SET "storeId" = store.id
FROM "Store" AS store
WHERE product."sellerId" = store."ownerId"
  AND product."storeId" IS DISTINCT FROM store.id;
