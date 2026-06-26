-- CreateTable
CREATE TABLE "invoice_bookings" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,

    CONSTRAINT "invoice_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_bookings_invoiceId_idx" ON "invoice_bookings"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_bookings_bookingId_idx" ON "invoice_bookings"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_bookings_invoiceId_bookingId_key" ON "invoice_bookings"("invoiceId", "bookingId");

-- AddForeignKey
ALTER TABLE "invoice_bookings" ADD CONSTRAINT "invoice_bookings_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_bookings" ADD CONSTRAINT "invoice_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
