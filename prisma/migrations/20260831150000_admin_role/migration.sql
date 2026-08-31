-- M9: Add admin flag to User for the /admin moderation panel.
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;