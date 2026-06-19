-- CreateTable
CREATE TABLE "business_advice" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "advice" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_advice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_refresh_logs" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_refresh_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_advice_hotelId_period_generatedAt_idx" ON "business_advice"("hotelId", "period", "generatedAt");

-- CreateIndex
CREATE INDEX "advisor_refresh_logs_hotelId_period_createdAt_idx" ON "advisor_refresh_logs"("hotelId", "period", "createdAt");

-- AddForeignKey
ALTER TABLE "business_advice" ADD CONSTRAINT "business_advice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
