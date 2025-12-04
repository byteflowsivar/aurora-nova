import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { getCurrentUserId } from '@/lib/server/require-permission';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import { NotAuthorized } from '@/modules/shared/components/presentational';
import { AuditLogTable, AuditFiltersContainer } from '@/modules/admin/components/containers';

export const metadata = {
  title: 'Registro de Auditoría',
  description: 'Revisa los registros y actividades de auditoría en todo el sistema.',
};

const AuditLogTablePlaceholder = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-6 w-1/4" />
  </div>
);

const AuditFiltersPlaceholder = () => (
  <div className="flex items-center space-x-4">
    <Skeleton className="h-10 w-1/4" />
    <Skeleton className="h-10 w-1/4" />
    <Skeleton className="h-10 w-1/4" />
    <Skeleton className="h-10 w-[100px]" />
  </div>
);


export default async function AuditLogPage() {
  const userId = await getCurrentUserId();
  const canView = userId && await hasPermission(userId, SYSTEM_PERMISSIONS.AUDIT_VIEW);

  if (!canView) {
    return <NotAuthorized />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Registro de Auditoría</h1>
      <p className="text-muted-foreground">
        Revisa los registros y actividades de auditoría en todo el sistema.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Refina los resultados del registro de auditoría.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AuditFiltersPlaceholder />}>
            <AuditFiltersContainer />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>
            Registro detallado de las acciones realizadas en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AuditLogTablePlaceholder />}>
            <AuditLogTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
