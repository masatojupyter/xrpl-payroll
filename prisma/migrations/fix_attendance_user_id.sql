-- Fix AttendanceRecord userId to use Employee ID instead of User ID
-- This migration updates existing attendance records to use the correct employee ID

-- First, create a mapping table to track User ID -> Employee ID
-- (This is a temporary table just for this migration)

-- For each attendance record, find the corresponding employee by email
-- and update the userId to the employee's ID

-- Update attendance records for John Doe
UPDATE "AttendanceRecord"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'john.doe@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'john.doe@techinnovations.com' AND role = 'employee'
);

-- Update attendance records for Jane Smith
UPDATE "AttendanceRecord"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'jane.smith@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'jane.smith@techinnovations.com' AND role = 'employee'
);

-- Update attendance records for Mike Johnson
UPDATE "AttendanceRecord"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'mike.johnson@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'mike.johnson@techinnovations.com' AND role = 'employee'
);

-- Update attendance records for Sarah Wilson
UPDATE "AttendanceRecord"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'sarah.wilson@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'sarah.wilson@techinnovations.com' AND role = 'employee'
);

-- Update attendance records for Emma Brown
UPDATE "AttendanceRecord"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'emma.brown@globalsolutions.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'emma.brown@globalsolutions.com' AND role = 'employee'
);

-- Update OperationLog to use Employee ID
UPDATE "OperationLog"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'john.doe@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'john.doe@techinnovations.com' AND role = 'employee'
);

-- Update TimerEvent to use Employee ID
UPDATE "TimerEvent"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'john.doe@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'john.doe@techinnovations.com' AND role = 'employee'
);

-- Update TimeCorrection to use Employee ID
UPDATE "TimeCorrection"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'john.doe@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'john.doe@techinnovations.com' AND role = 'employee'
);

UPDATE "TimeCorrection"
SET "userId" = (
  SELECT id FROM "Employee" WHERE email = 'user2@techinnovations.com'
)
WHERE "userId" IN (
  SELECT id FROM "User" WHERE email = 'user2@techinnovations.com' AND role = 'user'
);
