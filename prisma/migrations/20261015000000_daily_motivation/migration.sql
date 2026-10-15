-- Per-user opt-out for the daily motivation push (default on).
ALTER TABLE "User" ADD COLUMN "dailyMotivation" BOOLEAN NOT NULL DEFAULT true;
