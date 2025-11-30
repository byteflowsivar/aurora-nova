/**
 * Audit System - Public API
 *
 * Sistema de auditoría para trazabilidad y compliance.
 *
 * @module audit
 */

// Export service
export { auditService, AuditService } from './audit-service';

// Export helpers
export {
  getAuditContext,
  auditOperation,
  auditEntityChange,
} from './helpers';

// Export types
export type {
  AuditLogInput,
  AuditLogFilters,
  AuditLogResult,
  AuditLogWithUser,
} from './types';

export type { AuditContext, AuditOperationOptions } from './helpers';
