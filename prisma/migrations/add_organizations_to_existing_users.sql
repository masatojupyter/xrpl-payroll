-- Migration to add organizations to existing users without one
-- This script should be run manually to fix existing data

-- Create organizations for users without one
INSERT INTO "Organization" (id, name, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid() as id,
  COALESCE(u."companyName", u."firstName" || ' ' || u."lastName" || '''s Organization') as name,
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "User" u
WHERE u."organizationId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Organization" o 
    WHERE o.name = COALESCE(u."companyName", u."firstName" || ' ' || u."lastName" || '''s Organization')
  );

-- Update users to link them to their organizations
UPDATE "User" u
SET "organizationId" = o.id
FROM "Organization" o
WHERE u."organizationId" IS NULL
  AND o.name = COALESCE(u."companyName", u."firstName" || ' ' || u."lastName" || '''s Organization');
