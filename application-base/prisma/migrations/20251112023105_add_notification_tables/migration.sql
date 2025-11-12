-- CreateTable
CREATE TABLE "notification_template" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(255),
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_event" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "event_name" VARCHAR(100) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_name_key" ON "notification_template"("name");

-- CreateIndex
CREATE INDEX "notification_event_status_idx" ON "notification_event"("status");

-- CreateIndex
CREATE INDEX "notification_event_event_name_idx" ON "notification_event"("event_name");

-- CreateIndex
CREATE INDEX "notification_event_created_at_idx" ON "notification_event"("created_at");
