-- CreateTable
CREATE TABLE "ai_settings" (
    "hotelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "openaiKey" TEXT,
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "deepseekKey" TEXT,
    "deepseekModel" TEXT NOT NULL DEFAULT 'deepseek-chat',
    "geminiKey" TEXT,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 2000,
    "systemPrompt" TEXT NOT NULL DEFAULT 'You are Buffalo, a helpful hotel management assistant for Buffalo Hotel. Answer questions about hotel operations, bookings, guests, and staff in a professional manner. Respond in Kiswahili when possible.',
    "language" TEXT NOT NULL DEFAULT 'swahili',
    "responseStyle" TEXT NOT NULL DEFAULT 'professional',
    "includeCharts" BOOLEAN NOT NULL DEFAULT false,
    "autoAnalyze" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("hotelId")
);

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
