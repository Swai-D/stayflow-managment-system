-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "beds" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fullBoardRate" DECIMAL(10,2),
ADD COLUMN     "nonResidentRate" TEXT,
ADD COLUMN     "specialRate" DECIMAL(10,2);
