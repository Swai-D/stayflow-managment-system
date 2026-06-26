-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "nationality" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "ageCategory" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_idx" ON "booking_guests"("bookingId");

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
