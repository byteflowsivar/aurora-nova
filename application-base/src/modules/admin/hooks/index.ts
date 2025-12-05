/**
 * Módulo de Hooks Administrativos - Aurora Nova
 *
 * Colección de hooks específicos para funcionalidad administrativa.
 * Importa desde este archivo en lugar de desde archivos individuales.
 *
 * **Disponibles**:
 *
 * **Auditoría** (desde use-audit-logs.ts):
 * - `useAuditLogs(options)` - Obtener registros de auditoría con paginación y filtros
 *   - Parámetros: page, limit, filters
 *   - Retorna: { data: AuditLogResult, isLoading, error }
 *   - Filtra por: usuario, acción, módulo, área, rango de fechas
 *
 * @example
 * ```typescript
 * // Importar hooks admin
 * import { useAuditLogs } from '@/modules/admin/hooks'
 *
 * function AuditLogTable() {
 *   const { data, isLoading, error } = useAuditLogs({
 *     page: 1,
 *     limit: 10,
 *     filters: { area: 'admin' }
 *   })
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error error={error} />
 *
 *   return <Table data={data.logs} />
 * }
 * ```
 *
 * @module admin/hooks
 * @see {@link ./use-audit-logs.ts} para documentación de useAuditLogs
 * @see {@link @/modules/shared/hooks} para hooks compartidos (auth, debounce, mobile)
 */

export { useAuditLogs } from './use-audit-logs'
