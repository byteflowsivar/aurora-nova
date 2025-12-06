/**
 * Hook useAuditLogs - Obtener y gestionar registros de auditoría
 *
 * Hook para obtener registros de auditoría del servidor con soporte para paginación,
 * filtrado, y manejo de estados (cargando, error, datos). Realiza llamadas API
 * automáticas cuando cambian los parámetros.
 *
 * **Responsabilidades**:
 * - Obtener logs de auditoría desde `/api/admin/audit`
 * - Manejar paginación (page, limit) y offset automático
 * - Aplicar filtros (usuario, acción, módulo, área, fechas)
 * - Convertir filtros Date a ISO strings para la API
 * - Gestionar estados: cargando, error, datos
 * - Hacer llamadas API y reintentando automáticamente si cambian parámetros
 *
 * **API Endpoint**:
 * - Ruta: `/api/admin/audit` (GET)
 * - Query params: limit, offset, userId, action, module, area, startDate, endDate
 * - Requiere: Autenticación y permiso admin:read
 *
 * @hook
 * @param {UseAuditLogsProps} props - Opciones del hook
 * @param {number} [props.page=1] - Número de página (1-indexed)
 * @param {number} [props.limit=10] - Registros por página
 * @param {AuditLogFilters} [props.filters={}] - Filtros a aplicar
 *
 * @returns {Object} Objeto con estado y datos
 * @returns {AuditLogResult} return.data - Resultados de auditoría
 * @returns {AuditLogWithUser[]} return.data.logs - Array de logs con información del usuario
 * @returns {number} return.data.total - Total de registros sin paginar
 * @returns {number} return.data.count - Registros en esta página
 * @returns {number} return.data.limit - Registros por página
 * @returns {number} return.data.offset - Offset aplicado (page-1) * limit
 * @returns {boolean} return.data.hasMore - true si hay más páginas
 * @returns {boolean} return.isLoading - true mientras se obtienen datos
 * @returns {Error | null} return.error - Error si falla la llamada API
 *
 * **Estructura de AuditLogResult**:
 * ```typescript
 * {
 *   logs: AuditLogWithUser[],  // Array de logs de auditoría
 *   total: number,              // Total de registros (sin paginar)
 *   count: number,              // Registros en esta página
 *   limit: number,              // Registros por página (parámetro)
 *   offset: number,             // (page - 1) * limit
 *   hasMore: boolean            // count > 0 && offset + count < total
 * }
 * ```
 *
 * **Filtros Soportados**:
 * - userId?: string - ID del usuario que ejecutó la acción
 * - action?: string - Tipo de acción (LOGIN, CREATE, UPDATE, DELETE, LOGOUT, etc)
 * - module?: string - Módulo afectado (Auth, Roles, Users, Menu, etc)
 * - area?: string - Área de aplicación (admin, customer, public, system)
 * - startDate?: Date - Fecha de inicio del rango (se convierte a ISO string)
 * - endDate?: Date - Fecha de fin del rango (se convierte a ISO string)
 *
 * **Comportamiento**:
 * 1. Al montar: realiza llamada API con parámetros iniciales
 * 2. Al cambiar page/limit/filters: dispara nueva llamada automáticamente
 * 3. Durante carga: isLoading = true, error = null
 * 4. Si falla: isLoading = false, error = Error, data = default vacío
 * 5. Al éxito: isLoading = false, error = null, data = resultado
 *
 * **Conversión de Filtros**:
 * - Filtros Date se convierten a ISO string: `date.toISOString()`
 * - Otros valores se castean a string: `String(value)`
 * - null/undefined se omiten del queryString
 * - Se usar URLSearchParams para encoding seguro
 *
 * **Cálculo de Offset**:
 * - offset = (page - 1) * limit
 * - Ejemplo: page=2, limit=10 → offset=10 (salta primeros 10)
 *
 * **Casos de Uso**:
 * - Tabla de auditoría con paginación y filtros
 * - Dashboard administrativo con logs de actividad
 * - Investigación de acciones de usuarios
 * - Compliance y seguridad
 *
 * **Notas**:
 * - Los filtros se serializan con JSON.stringify para dependency array
 * - Error handling captura tanto Error como unknown types
 * - Data inicial es un objeto vacío pero válido (no undefined)
 * - Hook es agnóstico a la lógica de UI/routing
 *
 * @example
 * ```tsx
 * function AuditLogTable() {
 *   const [page, setPage] = React.useState(1)
 *   const { data, isLoading, error } = useAuditLogs({
 *     page,
 *     limit: 10,
 *     filters: { area: 'admin' }
 *   })
 *
 *   if (isLoading) return <Skeleton />
 *   if (error) return <Error message={error.message} />
 *
 *   return (
 *     <>
 *       <Table data={data.logs} />
 *       <Pagination
 *         current={page}
 *         total={Math.ceil(data.total / data.limit)}
 *         onChange={setPage}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Con filtros complejos
 * const { data } = useAuditLogs({
 *   page: 1,
 *   limit: 20,
 *   filters: {
 *     userId: 'user-123',
 *     action: 'DELETE',
 *     module: 'Users',
 *     startDate: new Date('2024-01-01'),
 *     endDate: new Date('2024-12-31')
 *   }
 * })
 * ```
 *
 * **Dependencias en Effect**:
 * - page: cambiar página recarga datos
 * - limit: cambiar límite recarga datos
 * - filtersString: JSON.stringify de filters (evita re-renders por mutación)
 *
 * **Performance**:
 * - Cachea datos hasta que page/limit/filters cambien
 * - No hace polling, solo obtiene cuando se montan o params cambian
 * - Serialización JSON de filtros es O(n) pero aceptable
 *
 * @see {@link AuditLogFilters} para tipos de filtros
 * @see {@link AuditLogResult} para estructura de resultado
 * @see {@link AuditLogWithUser} para estructura de log individual
 */

import { useState, useEffect } from 'react';
import { API_ROUTES } from "@/modules/shared/constants/api-routes"
import { AuditLogFilters, AuditLogResult } from '@/modules/admin/services/audit-types';

interface UseAuditLogsProps {
    page?: number;
    limit?: number;
    filters?: AuditLogFilters;
}

export function useAuditLogs({ page = 1, limit = 10, filters = {} }: UseAuditLogsProps) {
  const [data, setData] = useState<AuditLogResult>({
    logs: [],
    total: 0,
    count: 0,
    limit: limit,
    offset: (page - 1) * limit,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filtersString = JSON.stringify(filters);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * limit;
        
        const processedFilters: Record<string, string> = {};
        for (const key in filters) {
          if (Object.prototype.hasOwnProperty.call(filters, key)) {
            const value = filters[key as keyof AuditLogFilters];
            if (value instanceof Date) {
              processedFilters[key] = value.toISOString();
            } else if (value !== undefined && value !== null) {
              processedFilters[key] = String(value);
            }
          }
        }

        const queryParams = new URLSearchParams({
          ...processedFilters,
          limit: limit.toString(),
          offset: offset.toString(),
        });

        const response = await fetch(`${API_ROUTES.ADMIN_AUDIT}?${queryParams.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
        }

        const result: AuditLogResult = await response.json();
        setData(result);
      } catch (e: unknown) {
        if (e instanceof Error) {
            setError(e);
        } else {
            setError(new Error("An unknown error occurred"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [page, limit, filtersString]);

  return { data, isLoading, error };
}
