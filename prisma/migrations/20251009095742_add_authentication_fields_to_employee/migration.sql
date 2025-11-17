/*
  Warnings:

  - A unique constraint covering the columns `[invitationToken]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "invitationExpiry" TIMESTAMP(3),
ADD COLUMN     "invitationToken" TEXT,
ADD COLUMN     "isInvitationAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_invitationToken_key" ON "Employee"("invitationToken");

-- CreateIndex
CREATE INDEX "Employee_invitationToken_idx" ON "Employee"("invitationToken");
