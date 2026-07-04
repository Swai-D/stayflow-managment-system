-- Create the new roles table
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Unique index on hotelId + name
CREATE UNIQUE INDEX "roles_hotelId_name_key" ON "roles"("hotelId", "name");

-- Add roleId to users (nullable first, so we can back-fill existing users)
ALTER TABLE "users" ADD COLUMN "roleId" TEXT;

-- Insert the four system roles for every existing hotel.
-- Admin gets the full permission catalog; the other three get their legacy arrays.
INSERT INTO "roles" ("id", "hotelId", "name", "description", "permissions", "isSystem", "updatedAt")
SELECT
    gen_random_uuid(),
    h."id",
    r."name",
    r."description",
    r."permissions",
    true,
    CURRENT_TIMESTAMP
FROM "hotels" h
CROSS JOIN LATERAL (VALUES
    ('admin', 'Full system access. Can manage users, settings, payroll and all operations.', '[
      "bookings:view","bookings:manage","bookings:checkin","bookings:checkout","bookings:extend",
      "guests:view","guests:manage",
      "rooms:view","rooms:manage",
      "housekeeping:view","housekeeping:manage",
      "pos:view","pos:charge","pos:checkout","pos:void",
      "payments:record","payments:view",
      "invoices:view","invoices:manage",
      "companies:view","companies:manage",
      "store:view","store:manage",
      "staff:view","staff:manage",
      "payroll:view","payroll:manage",
      "reports:view",
      "settings:view","settings:manage",
      "guest_portal:orders","guest_portal:requests",
      "developer:manage"
    ]'::jsonb),
    ('receptionist', 'Front desk operations: bookings, check-in/out, payments, POS, invoices and reports.', '[
      "bookings:view","bookings:manage","bookings:checkin","bookings:checkout","bookings:extend",
      "guests:view","guests:manage",
      "rooms:view",
      "housekeeping:view",
      "pos:view","pos:charge","pos:checkout",
      "payments:record","payments:view",
      "invoices:view","invoices:manage",
      "companies:view","companies:manage",
      "store:view",
      "reports:view",
      "guest_portal:orders","guest_portal:requests"
    ]'::jsonb),
    ('housekeeping', 'Room status updates, consumption logging and guest service requests.', '[
      "rooms:view",
      "housekeeping:view","housekeeping:manage",
      "store:view",
      "guest_portal:requests"
    ]'::jsonb),
    ('waiter', 'POS operations and guest portal food orders.', '[
      "pos:view","pos:charge",
      "guest_portal:orders"
    ]'::jsonb)
) AS r("name", "description", "permissions");

-- Map existing users to the system role with matching name in the same hotel.
UPDATE "users" u
SET "roleId" = r."id"
FROM "roles" r
WHERE u."hotelId" = r."hotelId"
  AND r."name" = u."role"::text;

-- Safety net: any unmatched user gets the receptionist role of their hotel.
UPDATE "users" u
SET "roleId" = r."id"
FROM "roles" r
WHERE u."roleId" IS NULL
  AND u."hotelId" = r."hotelId"
  AND r."name" = 'receptionist';

-- Make roleId mandatory before adding the foreign key
ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;

-- Add foreign key from users to roles
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the legacy role column and enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "UserRole";
