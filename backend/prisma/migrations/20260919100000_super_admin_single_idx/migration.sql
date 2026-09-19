-- Enforce exactly one Super Admin at the database level, regardless of how the
-- change is attempted (API, concurrency, or direct SQL). Partial unique index:
-- only rows with role = 'SUPER_ADMIN' are indexed, so multiple Admins and
-- Operators remain allowed.
CREATE UNIQUE INDEX "users_super_admin_single_idx"
  ON "users" ("role")
  WHERE "role" = 'SUPER_ADMIN';