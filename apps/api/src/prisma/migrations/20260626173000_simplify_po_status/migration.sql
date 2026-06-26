-- Simplify POStatus enum from 6 values to 3

-- Rename old enum
ALTER TYPE "POStatus" RENAME TO "POStatus_old";

-- Create new simplified enum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'RECEIVED', 'CLOSED');

-- Migrate existing purchase order statuses
ALTER TABLE "purchase_orders"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "POStatus" USING (
    CASE "status"
      WHEN 'DRAFT' THEN 'PENDING'::"POStatus"
      WHEN 'SUBMITTED' THEN 'PENDING'::"POStatus"
      WHEN 'APPROVED' THEN 'PENDING'::"POStatus"
      WHEN 'SENT_TO_SUPPLIER' THEN 'PENDING'::"POStatus"
      WHEN 'RECEIVED' THEN 'RECEIVED'::"POStatus"
      WHEN 'CLOSED' THEN 'CLOSED'::"POStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"POStatus";

-- Drop old enum
DROP TYPE "POStatus_old";
