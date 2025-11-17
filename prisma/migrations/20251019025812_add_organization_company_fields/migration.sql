-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "address" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fiscalYearStart" TEXT DEFAULT '04-01',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "taxId" TEXT;
