-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "paymentToken" TEXT;
