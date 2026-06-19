-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "dashboardOtp" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "hotels" ADD COLUMN     "paymentNumbers" JSONB DEFAULT '[]';
