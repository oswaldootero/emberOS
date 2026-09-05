-- CreateTable
CREATE TABLE "SocialHashtagBrief" (
    "id" TEXT NOT NULL,
    "forDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "items" JSONB NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialHashtagBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialHashtagBrief_forDate_key" ON "SocialHashtagBrief"("forDate");

