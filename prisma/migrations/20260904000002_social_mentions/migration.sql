-- CreateEnum
CREATE TYPE "SocialMentionSource" AS ENUM ('TAG', 'CAPTION_MENTION', 'COMMENT_MENTION');

-- CreateEnum
CREATE TYPE "SocialMentionStatus" AS ENUM ('NEW', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "SocialMention" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'Instagram',
    "source" "SocialMentionSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "mediaId" TEXT,
    "username" TEXT NOT NULL,
    "caption" TEXT,
    "permalink" TEXT,
    "mediaType" TEXT,
    "likeCount" INTEGER,
    "commentCount" INTEGER,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "status" "SocialMentionStatus" NOT NULL DEFAULT 'NEW',
    "influencerId" TEXT,
    "prospectId" TEXT,
    "loggedPostId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialMention_externalId_key" ON "SocialMention"("externalId");

-- CreateIndex
CREATE INDEX "SocialMention_status_postedAt_idx" ON "SocialMention"("status", "postedAt");

-- CreateIndex
CREATE INDEX "SocialMention_username_idx" ON "SocialMention"("username");

-- CreateIndex
CREATE INDEX "SocialMention_influencerId_idx" ON "SocialMention"("influencerId");

-- CreateIndex
CREATE INDEX "SocialMention_prospectId_idx" ON "SocialMention"("prospectId");

-- AddForeignKey
ALTER TABLE "SocialMention" ADD CONSTRAINT "SocialMention_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMention" ADD CONSTRAINT "SocialMention_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

