'use client';

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