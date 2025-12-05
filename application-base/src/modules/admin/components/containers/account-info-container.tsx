/**
 * Componente AccountInfo (Container)
 *
 * Tarjeta informativa que muestra detalles readonly de la cuenta del usuario.
 * Renderiza información como email, estado de verificación, tipo de autenticación,
 * fechas de creación y actualización.
 *
 * Este componente es responsable de:
 * - Mostrar email del usuario con estado de verificación (verificado/no verificado)
 * - Indicar tipo de autenticación (Credenciales vs OAuth)
 * - Mostrar fechas de creación y última actualización
 * - Proporcionar información técnica (ID) en sección colapsable
 * - Formatear fechas según locale español
 *
 * **Características**:
 * - Componente presentacional, solo lee información
 * - Badges para estados (verificado, tipo de autenticación)
 * - Iconos descriptivos usando lucide-react
 * - Información técnica oculta en <details> expandible
 * - Diseño con shadcn Card component
 * - Responsive y accesible
 *
 * @component
 * @returns {JSX.Element} Card con información de la cuenta
 *
 * @param {Object} props - Props del componente
 * @param {UserProfile} props.user - Datos del usuario a mostrar
 *
 * **Props Requeridas**:
 * - `user` (UserProfile): Objeto con información del usuario incluyendo:
 *   - id: UUID del usuario
 *   - email: Email verificado o no
 *   - emailVerified: Boolean indicando si email está verificado
 *   - hasCredentials: Boolean indicando si usa credenciales locales o OAuth
 *   - createdAt: Fecha de creación de la cuenta
 *   - updatedAt: Fecha de última actualización
 *
 * **Datos Mostrados**:
 * 1. **Correo Electrónico**: Email con badge de verificación
 *    - Verde si está verificado
 *    - Gris si no está verificado
 * 2. **Tipo de Autenticación**: Badge con método
 *    - "Credenciales (Email/Contraseña)" si usa contraseña local
 *    - "OAuth (Proveedor Externo)" si usa OAuth
 * 3. **Fecha de Creación**: Formateada en español (ej: "5 de diciembre de 2024")
 * 4. **Última Actualización**: Fecha de último cambio de perfil
 * 5. **Información Técnica**: ID de usuario en <details> colapsable
 *
 * **Flujo**:
 * 1. Recibe props con UserProfile
 * 2. Renderiza Card con HeaderTitle e ícono
 * 3. Mapea cada sección (email, auth type, fechas, technical info)
 * 4. Formatea fechas usando locale "es-ES"
 * 5. Muestra badges según estado (verificado, tipo auth)
 * 6. Información técnica en details expandible
 *
 * **Casos de Uso**:
 * - Mostrar información de cuenta en página de perfil/configuración
 * - Componente readonly que no permite edición directa
 * - Información de referencia rápida para el usuario
 *
 * **Notas**:
 * - Solo lectura (read-only), no maneja cambios
 * - Fechas se formatean en español
 * - ID es información sensible, se oculta en <details> por defecto
 * - No requiere hooks, es componente puro funcional
 *
 * @example
 * ```tsx
 * // En página de configuración de usuario
 * import { AccountInfo } from '@/modules/admin/components/containers/account-info-container'
 * import { getUserProfile } from '@/lib/queries'
 *
 * export default async function SettingsPage() {
 *   const user = await getUserProfile(userId)
 *   return <AccountInfo user={user} />
 * }
 * ```
 *
 * @see {@link UserProfile} para la estructura de datos del usuario
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
