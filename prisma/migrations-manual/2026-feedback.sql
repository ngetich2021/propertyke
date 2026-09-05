-- Manual incremental migration: general product feedback (see
-- lib/actions/feedback.ts). Distinct from Report (flags a listing) and
-- SupportTicket (a help request needing a reply) -- purely informational.
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");
