/*
  Warnings:

  - A unique constraint covering the columns `[attendanceRecordId]` on the table `Payroll` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "attendanceRecordId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_attendanceRecordId_key" ON "Payroll"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "Payroll_attendanceRecordId_idx" ON "Payroll"("attendanceRecordId");

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
