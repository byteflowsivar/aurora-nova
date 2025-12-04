-- CreateTable for AuditLog
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" VARCHAR(255),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_id" UUID,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for performance
CREATE INDEX "idx_audit_log_user_id" ON "audit_log"("user_id");
CREATE INDEX "idx_audit_log_action" ON "audit_log"("action");
CREATE INDEX "idx_audit_log_module" ON "audit_log"("module");
CREATE INDEX "idx_audit_log_entity" ON "audit_log"("entity_type", "entity_id");
CREATE INDEX "idx_audit_log_timestamp" ON "audit_log"("timestamp");
CREATE INDEX "idx_audit_log_request_id" ON "audit_log"("request_id");

-- AddForeignKey for user relationship
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
