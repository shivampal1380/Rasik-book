-- AlterTable
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CASH');
ALTER TABLE "book_entries" ADD COLUMN "paymentMethod" "PaymentMethod";