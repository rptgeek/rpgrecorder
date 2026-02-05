-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "transcriptJson" JSONB,
ADD COLUMN     "transcriptionJobId" TEXT;
