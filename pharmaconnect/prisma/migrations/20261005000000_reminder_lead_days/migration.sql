-- SPECS 5B: reminders fire leadDays before the course runs out.
ALTER TABLE "Reminder" ADD COLUMN "leadDays" INTEGER NOT NULL DEFAULT 3;
