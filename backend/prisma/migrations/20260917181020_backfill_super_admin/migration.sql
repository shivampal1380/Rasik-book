-- Promote the earliest existing ADMIN to SUPER_ADMIN so the system always
-- has exactly one super-admin account (fresh databases have none here; the
-- seed creates the single SUPER_ADMIN).
UPDATE "users"
SET role = 'SUPER_ADMIN'
WHERE id = (
  SELECT id FROM "users" WHERE role = 'ADMIN' ORDER BY "createdAt" ASC, "id" ASC LIMIT 1
);