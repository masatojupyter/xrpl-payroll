-- CreateTable
CREATE TABLE "TimerEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "durationFromPrevious" INTEGER,
    "endTimestamp" BIGINT,
    "memo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimerEvent_userId_idx" ON "TimerEvent"("userId");

-- CreateIndex
CREATE INDEX "TimerEvent_attendanceRecordId_idx" ON "TimerEvent"("attendanceRecordId");

-- CreateIndex
CREATE INDEX "TimerEvent_timestamp_idx" ON "TimerEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TimerEvent_eventType_idx" ON "TimerEvent"("eventType");

-- AddForeignKey
ALTER TABLE "TimerEvent" ADD CONSTRAINT "TimerEvent_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
