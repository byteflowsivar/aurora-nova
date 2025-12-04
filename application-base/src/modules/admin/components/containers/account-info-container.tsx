/**
 * Componente de Información de Cuenta
 * Muestra información readonly sobre la cuenta del usuario
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/modules/admin/types';
import {
  Info,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AccountInfoProps {
  user: UserProfile;
}

export function AccountInfo({ user }: AccountInfoProps) {
  // Formatear fechas
  const formatDate = (date: Date | null) => {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Información de la Cuenta
        </CardTitle>
        <CardDescription>
          Detalles de tu cuenta y estado de verificación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Correo Electrónico</p>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{user.email}</p>
          </div>
          {user.emailVerified ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Verificado
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              No verificado
            </Badge>
          )}
        </div>

        {/* Tipo de Autenticación */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Tipo de Autenticación</p>
          </div>
          <div className="pl-6">
            {user.hasCredentials ? (
              <Badge variant="outline">Credenciales (Email/Contraseña)</Badge>
            ) : (
              <Badge variant="outline">OAuth (Proveedor Externo)</Badge>
            )}
          </div>
        </div>

        {/* Fecha de Creación */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Cuenta Creada</p>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {formatDate(user.createdAt)}
          </p>
        </div>

        {/* Última Actualización */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Última Actualización</p>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            {formatDate(user.updatedAt)}
          </p>
        </div>

        {/* ID de Usuario (para debugging) */}
        <div className="pt-4 border-t">
          <details className="cursor-pointer">
            <summary className="text-xs text-muted-foreground hover:text-foreground">
              Información técnica
            </summary>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">ID de Usuario:</span>{' '}
                <code className="bg-muted px-1 py-0.5 rounded">{user.id}</code>
              </p>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
