'use client';

/**
 * Componente ChangePasswordForm (Container)
 *
 * Formulario seguro para cambiar la contraseña del usuario.
 * Valida requisitos de seguridad, revoca sesiones anteriores si es necesario.
 *
 * Este componente es responsable de:
 * - Recolectar contraseña actual y nueva contraseña (2x para confirmar)
 * - Validar requisitos de seguridad (8+ chars, mayús, número, especial)
 * - Hacer POST a API para cambiar contraseña
 * - Manejar revocación de sesiones (logout después del cambio)
 * - Mostrar toggle de visibilidad para los 3 campos de contraseña
 * - Mostrar lista de requisitos en UI
 * - Manejar estados de loading y errores
 *
 * **Características**:
 * - Integración con react-hook-form + Zod
 * - Validación en tiempo real de requisitos
 * - 3 campos de contraseña con toggle de visibilidad (Eye icon)
 * - Lista visual de requisitos de contraseña
 * - Loading state en botón durante envío
 * - Toast notifications (éxito/error)
 * - Revocación automática de sesiones después de cambio
 * - Auto-logout si se revocan sesiones
 * - Redirección a login tras logout
 *
 * @component
 * @returns {JSX.Element} Card con formulario de cambio de contraseña
 *
 * @param {Object} props - Props del componente
 * @param {() => void} [props.onSuccess] - Callback opcional tras cambio exitoso (no revocar sesiones)
 *
 * **Props Opcionales**:
 * - `onSuccess` (function): Se ejecuta si cambio es exitoso pero NO revoca sesiones
 *
 * **Campos del Formulario**:
 * 1. **Contraseña Actual** (requerido)
 *    - Input password con toggle de visibilidad
 *    - Validación: debe coincidir con la actual
 *    - Requerido para confirmar identidad
 * 2. **Nueva Contraseña** (requerido)
 *    - Input password con toggle de visibilidad
 *    - Validaciones estrictas:
 *      - Mínimo 8 caracteres
 *      - Al menos 1 mayúscula
 *      - Al menos 1 número
 *      - Al menos 1 carácter especial (!@#$%^&*)
 * 3. **Confirmar Nueva Contraseña** (requerido)
 *    - Input password con toggle de visibilidad
 *    - Debe coincidir exactamente con "Nueva Contraseña"
 *
 * **Estados Internos**:
 * - `isLoading`: Boolean indicando si está enviando al servidor
 * - `showCurrentPassword`: Boolean para mostrar/ocultar contraseña actual
 * - `showNewPassword`: Boolean para mostrar/ocultar nueva contraseña
 * - `showConfirmPassword`: Boolean para mostrar/ocultar confirmación
 * - `form`: Estado del formulario con react-hook-form
 *
 * **Flujo**:
 * 1. Usuario ingresa contraseña actual (para verificación)
 * 2. Usuario ingresa nueva contraseña (con requisitos mostrados)
 * 3. Usuario confirma nueva contraseña
 * 4. En submit:
 *    - Valida datos localmente con changePasswordSchema
 *    - POST a /api/customer/change-password con datos
 *    - Si exitoso y NO revoca sesiones:
 *      - toast success
 *      - reset form
 *      - callback onSuccess() si existe
 *    - Si exitoso y REVOCA sesiones:
 *      - toast success con mensaje especial (4s de duración)
 *      - Espera 2.5s para que usuario lea
 *      - Llama logoutUser() server action
 *      - Redirecciona a /admin/auth/signin
 *    - Si error: toast error con mensaje descriptivo
 *
 * **API Integration**:
 * - Endpoint: POST /api/customer/change-password
 * - Body: { currentPassword, newPassword, confirmPassword }
 * - Response: { success: boolean, sessionsRevoked?: boolean, error?: string }
 * - Auth: Requiere sesión autenticada
 * - Razón de revocación: Cambio de contraseña invalidaría tokens por seguridad
 *
 * **Seguridad**:
 * - Validación estricta de requisitos (8+ chars, mayús, número, especial)
 * - Contraseña nueva no puede ser igual a la actual (validación en servidor)
 * - Revocación de todas las sesiones después del cambio
 * - Logout automático para forzar re-autenticación con nueva contraseña
 * - Validación en servidor, no solo en cliente
 * - No expone contraseñas en mensajes de error
 *
 * **Requisitos de Contraseña UI**:
 * - Mostrados como checklist con iconos
 * - Ayuda al usuario a cumplir requisitos antes de enviar
 * - Visual feedback en tiempo real (si se implementa)
 *
 * **Casos de Uso**:
 * - Página de configuración/seguridad del usuario
 * - Cambio proactivo de contraseña por seguridad
 * - Cambio forzado después de cierto tiempo
 *
 * **Notas**:
 * - Los 3 inputs tienen toggle independiente de visibilidad
 * - Sesiones se revocan para seguridad (invalidar tokens antiguos)
 * - No es un "soft logout", es completo en servidor
 * - Redirección a login es segura (router + refresh)
 *
 * @example
 * ```tsx
 * // En página de configuración/seguridad
 * import { ChangePasswordForm } from '@/modules/admin/components/containers/change-password-form-container'
 *
 * export default function SecurityPage() {
 *   return (
 *     <div className="max-w-md">
 *       <h1>Seguridad de Cuenta</h1>
 *       <ChangePasswordForm />
 *     </div>
 *   )
 * }
 * ```
 *
 * @see {@link changePasswordSchema} para validaciones Zod
 * @see {@link logoutUser} para la server action de logout
 */

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { changePasswordSchema } from '@/modules/shared/validations';
import type { ChangePasswordData } from '@/modules/admin/types';
import { API_ROUTES } from '@/modules/shared/constants/api-routes';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { logoutUser } from '@/actions/auth';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: ChangePasswordData) {
    setIsLoading(true);

    try {
      const response = await fetch(API_ROUTES.CUSTOMER_CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar contraseña');
      }

      // Si se revocaron las sesiones, mostrar mensaje especial y redirigir
      if (result.sessionsRevoked) {
        toast.success('Contraseña actualizada', {
          description: 'Tu contraseña ha sido cambiada. Por seguridad, debes iniciar sesión nuevamente.',
          duration: 4000,
        });

        // Esperar un momento para que el usuario lea el mensaje, luego cerrar sesión limpiamente
        setTimeout(async () => {
          // Llamar al logoutUser para limpiar correctamente la sesión
          const logoutResult = await logoutUser();

          if (logoutResult.success) {
            // Redirigir al login administrativo
            router.push('/admin/auth/signin');
            router.refresh();
          } else {
            // Si falla el logout, forzar recarga completa
            window.location.href = '/admin/auth/signin';
          }
        }, 2500);
      } else {
        toast.success('Contraseña actualizada', {
          description: 'Tu contraseña ha sido cambiada exitosamente.',
        });

        // Reset form
        form.reset();

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Error al cambiar contraseña', {
        description:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al cambiar tu contraseña. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Cambiar Contraseña
        </CardTitle>
        <CardDescription>
          Actualiza tu contraseña para mantener tu cuenta segura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contraseña Actual */}
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña Actual</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Ingresa tu contraseña actual"
                        {...field}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        disabled={isLoading}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nueva Contraseña */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Ingresa tu nueva contraseña"
                        {...field}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={isLoading}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Debe contener al menos 8 caracteres, una mayúscula, un número y un carácter especial.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmar Nueva Contraseña */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirma tu nueva contraseña"
                        {...field}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requisitos de Contraseña */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Requisitos de contraseña:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Mínimo 8 caracteres
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Al menos una letra mayúscula
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Al menos un número
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Al menos un carácter especial (!@#$%^&*)
                </li>
              </ul>
            </div>

            {/* Botón Submit */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
