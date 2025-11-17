/*
  Warnings:

  - Added the required column `organizationId` to the `Payroll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmountUSD` to the `Payroll` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Payroll_employeeId_idx";

-- DropIndex
DROP INDEX "public"."Payroll_period_idx";

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "exchangeRate" DECIMAL(18,6),
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "lastRetryAt" TIMESTAMP(3),
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmountUSD" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "totalAmountXRP" DECIMAL(18,6),
ADD COLUMN     "transactionStatus" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "fromWalletAddress" TEXT NOT NULL,
    "toWalletAddress" TEXT NOT NULL,
    "amountUSD" DECIMAL(18,2) NOT NULL,
    "amountXRP" DECIMAL(18,6) NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "transactionHash" TEXT,
    "ledgerIndex" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "initiatedBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_payrollId_key" ON "PaymentTransaction"("payrollId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionHash_key" ON "PaymentTransaction"("transactionHash");

-- CreateIndex
CREATE INDEX "PaymentTransaction_payrollId_idx" ON "PaymentTransaction"("payrollId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_transactionHash_idx" ON "PaymentTransaction"("transactionHash");

-- CreateIndex
CREATE INDEX "PaymentTransaction_createdAt_idx" ON "PaymentTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Payroll_organizationId_period_idx" ON "Payroll"("organizationId", "period");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_period_idx" ON "Payroll"("employeeId", "period");

-- CreateIndex
CREATE INDEX "Payroll_transactionStatus_idx" ON "Payroll"("transactionStatus");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
