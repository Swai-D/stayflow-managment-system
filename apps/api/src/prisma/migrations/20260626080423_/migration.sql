-- CreateEnum
CREATE TYPE "GuestAccountStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE');

-- CreateEnum
CREATE TYPE "RoomServiceOrderStatus" AS ENUM ('PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('laundry', 'taxi', 'tour', 'housekeeping', 'other');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "guest_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "activationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "status" "GuestAccountStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "linkedBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_service_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "guestAccountId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "RoomServiceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "guestAccountId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ServiceRequestType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "extraNights" INTEGER NOT NULL,
    "requestedNewCheckout" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "ExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_accounts_email_key" ON "guest_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "guest_accounts_activationToken_key" ON "guest_accounts"("activationToken");

-- CreateIndex
CREATE UNIQUE INDEX "room_service_orders_orderId_key" ON "room_service_orders"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_requestId_key" ON "service_requests"("requestId");

-- AddForeignKey
ALTER TABLE "room_service_orders" ADD CONSTRAINT "room_service_orders_guestAccountId_fkey" FOREIGN KEY ("guestAccountId") REFERENCES "guest_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_service_orders" ADD CONSTRAINT "room_service_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_guestAccountId_fkey" FOREIGN KEY ("guestAccountId") REFERENCES "guest_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
