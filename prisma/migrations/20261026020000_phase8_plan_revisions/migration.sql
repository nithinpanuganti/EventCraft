-- CreateTable
CREATE TABLE "plan_revisions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "diffPayload" JSONB NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_revisions_eventId_idx" ON "plan_revisions"("eventId");

-- CreateIndex
CREATE INDEX "plan_revisions_version_idx" ON "plan_revisions"("version");

-- AddForeignKey
ALTER TABLE "plan_revisions" ADD CONSTRAINT "plan_revisions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
