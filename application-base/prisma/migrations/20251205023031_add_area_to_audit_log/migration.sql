-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "area" VARCHAR(50);

-- CreateIndex
CREATE INDEX "idx_audit_log_area" ON "audit_log"("area");
