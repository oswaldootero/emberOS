-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_createdById_fkey";

-- DropForeignKey
ALTER TABLE "InventoryAdjustment" DROP CONSTRAINT "InventoryAdjustment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLink" DROP CONSTRAINT "PaymentLink_customerId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLink" DROP CONSTRAINT "PaymentLink_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLink" DROP CONSTRAINT "PaymentLink_capturedCardId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLink" DROP CONSTRAINT "PaymentLink_createdById_fkey";

-- DropForeignKey
ALTER TABLE "CardOnFile" DROP CONSTRAINT "CardOnFile_customerId_fkey";

-- DropIndex
DROP INDEX "InventoryAdjustment_orderId_idx";

-- AlterTable
ALTER TABLE "InventoryAdjustment" DROP COLUMN "orderId",
ADD COLUMN     "saleId" TEXT;

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "PaymentLink";

-- DropTable
DROP TABLE "CardOnFile";

-- DropEnum
DROP TYPE "OrderPaymentStatus";

-- DropEnum
DROP TYPE "OrderFulfillmentStatus";

-- DropEnum
DROP TYPE "PaymentLinkStatus";

-- CreateIndex
CREATE INDEX "InventoryAdjustment_saleId_idx" ON "InventoryAdjustment"("saleId");

-- AddForeignKey
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

