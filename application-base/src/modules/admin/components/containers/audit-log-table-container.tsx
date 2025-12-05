'use client';

/**
 * Componente AuditLogTable (Container)
 *
 * Tabla para mostrar registros de auditoría con paginación, sorting y filtrado.
 * Renderiza eventos de auditoría del sistema con información completa del usuario y acción.
 *
 * Este componente es responsable de:
 * - Mostrar lista de eventos de auditoría en tabla
 * - Cargar datos con useAuditLogs hook (con paginación)
 * - Sincronizar paginación con URL search params
 * - Renderizar columnas: fecha, usuario, acción, módulo, área, IP
 * - Permitir dropdown actions por fila (para future features)
 * - Mostrar skeleton loaders durante carga
 * - Manejar paginación (Anterior/Siguiente)
 * - Integración con TanStack React Table (v8)
 *
 * **Características**:
 * - Tabla data-driven con TanStack React Table
 * - Paginación manual (controlada por server)
 * - Columnas con formateo personalizado (fechas, badges, áreas)
 * - Dropdown menu en cada fila para future actions
 * - Loading state con Skeleton loaders
 * - Mensaje "No hay resultados" cuando está vacío
 * - Botones Anterior/Siguiente deshabilitados según estado
 * - Responsive y accesible
 * - URL search params para estado de paginación/filtros
 *
 * @component
 * @returns {JSX.Element} Tabla de auditoría con paginación
 *
 * **Props**: Ninguno (sin props requeridas)
 *
 * **Columnas de Tabla**:
 * 1. **Fecha** (timestamp)
 *    - Formateada con toLocaleString()
 *    - Formato: "dd/mm/yyyy, HH:MM:SS"
 *    - Ordenable (sorteable)
 * 2. **Usuario** (user)
 *    - Muestra email del usuario (fallback: name)
 *    - Si es sistema: muestra "Sistema"
 *    - Usuario completo del evento
 * 3. **Acción** (action)
 *    - Mostrado como Badge secondary
 *    - Valores: LOGIN, CREATE, UPDATE, DELETE, etc
 * 4. **Módulo** (module)
 *    - Nombre del módulo (Auth, Roles, Users, etc)
 * 5. **Área** (area)
 *    - Con emojis y traducción:
 *      - 👤 Admin
 *      - 🛍️ Cliente
 *      - 🌐 Público
 *      - ⚙️ Sistema
 *    - Si null: muestra "-"
 * 6. **Dirección IP** (ipAddress)
 *    - IP del cliente que ejecutó la acción
 * 7. **Acciones** (dropdown menu)
 *    - Botón MoreHorizontal con menu desplegable
 *    - Option: "Ver Detalles" (future: modal con details)
 *
 * **Estados Internos**:
 * - `sorting`: SortingState de TanStack para columnas ordenables
 * - `pagination`: { pageIndex, pageSize } - estado de paginación
 * - `page`: Number leído de URL params (defecto: 1)
 * - `limit`: Number leído de URL params (defecto: 10)
 * - `filters`: AuditLogFilters construida desde URL params
 *
 * **Flujo**:
 * 1. Al montar: lee URL search params (page, limit, filtros)
 * 2. Llama useAuditLogs hook con page, limit y filters
 * 3. Hook retorna { data: auditLogResult, isLoading }
 * 4. Si cargando: muestra Skeleton loaders
 * 5. Si datos: renderiza tabla con TanStack React Table
 * 6. En click Siguiente/Anterior: actualiza pagination state
 * 7. Se puede sincronizar URL con estado (manual en parent)
 *
 * **URL Params Soportados**:
 * - page: Página actual (1-indexed)
 * - limit: Registros por página (defecto: 10)
 * - userId: ID usuario a filtrar
 * - action: Tipo de acción a filtrar
 * - module: Módulo a filtrar
 * - area: Área a filtrar
 * - startDate: Fecha inicio en ISO format
 * - endDate: Fecha fin en ISO format
 *
 * **Paginación**:
 * - Manual (controlada por servidor, no cliente)
 * - Botón Anterior/Siguiente
 * - Se deshabilita según pageIndex
 * - No hay inputs de salto a página
 * - pageSize fijo desde URL (defecto: 10)
 *
 * **Loading State**:
 * - Skeleton loaders de altura h-12
 * - Cantidad = pageSize actual
 * - Se muestra solo si isLoading && !data.length
 * - Desaparece cuando hay datos
 *
 * **Casos de Uso**:
 * - Página de auditoría/logs administrativos
 * - Visualización de eventos del sistema
 * - Investigación de acciones de usuarios
 * - Compliance y seguridad
 *
 * **Notas**:
 * - TanStack React Table v8 para estructura flexible
 * - Paginación MANUAL (no client-side)
 * - Sorting STATE pero sin implementación server-side actual
 * - Dropdown actions preparado para future features
 * - useAuditLogs hook hace la llamada API
 *
 * @example
 * ```tsx
 * // En página de auditoría
 * import { AuditFilters } from '@/modules/admin/components/containers/audit-filters-container'
 * import { AuditLogTable } from '@/modules/admin/components/containers/audit-log-table-container'
 *
 * export default function AuditPage() {
 *   return (
 *     <div className="space-y-6">
 *       <AuditFilters />
 *       <AuditLogTable />
 *     </div>
 *   )
 * }
 * ```
 *
 * @see {@link useAuditLogs} para el hook que obtiene datos
 * @see {@link AuditFilters} para los filtros que controlan esta tabla
 */

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLogFilters, AuditLogWithUser } from '@/modules/admin/services/audit-types';
import { useAuditLogs } from '@/modules/admin/hooks';

export const columns: ColumnDef<AuditLogWithUser>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Fecha',
    cell: ({ row }) => new Date(row.getValue('timestamp')).toLocaleString(),
  },
  {
    accessorKey: 'user',
    header: 'Usuario',
    cell: ({ row }) => {
      const user = row.getValue('user') as AuditLogWithUser['user'];
      return user?.email || user?.name || 'Sistema';
    },
  },
  {
    accessorKey: 'action',
    header: 'Acción',
     cell: ({ row }) => {
      const action = row.getValue('action') as string;
      return <Badge variant="secondary">{action}</Badge>;
    },
  },
  {
    accessorKey: 'module',
    header: 'Módulo',
  },
  {
    accessorKey: 'area',
    header: 'Área',
    cell: ({ row }) => {
      const area = row.getValue('area') as string | null;
      if (!area) return '-';
      const areaLabels: Record<string, string> = {
        'admin': '👤 Admin',
        'customer': '🛍️ Cliente',
        'public': '🌐 Público',
        'system': '⚙️ Sistema',
      };
      return areaLabels[area] || area;
    },
  },
  {
    accessorKey: 'ipAddress',
    header: 'Dirección IP',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const log = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('View details for', log.id)}>
              Ver Detalles
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function AuditLogTable() {
  const searchParams = useSearchParams();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  
  const filters = React.useMemo(() => {
    const f: AuditLogFilters = {};
    if (searchParams.has('userId')) f.userId = searchParams.get('userId')!;
    if (searchParams.has('action')) f.action = searchParams.get('action')!;
    if (searchParams.has('module')) f.module = searchParams.get('module')!;
    if (searchParams.has('area')) f.area = searchParams.get('area')!;
    if (searchParams.has('startDate')) f.startDate = new Date(searchParams.get('startDate')!);
    if (searchParams.has('endDate')) f.endDate = new Date(searchParams.get('endDate')!);
    return f;
  }, [searchParams]);

  const [{ pageIndex, pageSize }, setPagination] = React.useState({
    pageIndex: page - 1,
    pageSize: limit,
  });

  const { data: auditLogResult, isLoading } = useAuditLogs({
      page: pageIndex + 1,
      limit: pageSize,
      filters,
  });
  
  const data = React.useMemo(() => auditLogResult?.logs ?? [], [auditLogResult]);
  const pageCount = React.useMemo(() => {
    if (!auditLogResult) return 0;
    return Math.ceil(auditLogResult.total / auditLogResult.limit);
  }, [auditLogResult]);

  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount,
    state: {
      sorting,
      pagination,
    },
  });
  
  React.useEffect(() => {
      setPagination({ pageIndex: page - 1, pageSize: limit });
  }, [page, limit]);

  if (isLoading && !data.length) {
      return (
          <div className="space-y-2">
              {[...Array(pageSize)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
              ))}
          </div>
      )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}