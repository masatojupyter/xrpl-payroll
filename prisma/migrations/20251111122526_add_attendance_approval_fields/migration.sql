/*
  Warnings:

  - You are about to drop the column `breakEndTime` on the `AttendanceRecord` table. All the data in the column will be lost.
  - You are about to drop the column `breakStartTime` on the `AttendanceRecord` table. All the data in the column will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('present', 'absent', 'leave', 'holiday', 'sick_leave', 'half_day');

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_employeeId_fkey";

-- AlterTable
ALTER TABLE "AttendanceRecord" DROP COLUMN "breakEndTime",
DROP COLUMN "breakStartTime",
ADD COLUMN     "approvalComment" TEXT,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" BIGINT,
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "attendanceType" "AttendanceType" NOT NULL DEFAULT 'present',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- DropTable
DROP TABLE "public"."Attendance";

-- CreateIndex
CREATE INDEX "AttendanceRecord_attendanceType_idx" ON "AttendanceRecord"("attendanceType");

-- CreateIndex
CREATE INDEX "AttendanceRecord_approvalStatus_idx" ON "AttendanceRecord"("approvalStatus");
