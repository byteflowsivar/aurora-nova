'use client';

/**
 * Componente ProfileForm (Container)
 *
 * Formulario para actualizar información del perfil del usuario.
 * Permite editar nombre y apellido con validación y manejo de errores.
 *
 * Este componente es responsable de:
 * - Renderizar formulario con campos de nombre y apellido
 * - Validación de entrada con Zod schema
 * - Llamada a API para actualizar perfil
 * - Manejo de estados de loading y errores
 * - Notificaciones via toast (éxito/error)
 * - Redirección tras actualización exitosa
 *
 * **Características**:
 * - Integración con react-hook-form + Zod
 * - Validación en tiempo real
 * - Loading state en botón durante submit
 * - Toast notifications (éxito/error)
 * - Manejo robusto de errores
 * - Diseño con shadcn Card y Form components
 * - Responsive
 *
 * @component
 * @returns {JSX.Element} Card con formulario de perfil
 *
 * @param {Object} props - Props del componente
 * @param {UserProfile} props.user - Datos del usuario actual
 *
 * **Props Requeridas**:
 * - `user` (UserProfile): Objeto con datos actuales del usuario
 *   - firstName: Nombre del usuario
 *   - lastName: Apellido del usuario
 *
 * **Validaciones**:
 * - firstName: Mínimo 1 carácter, máximo requerido
 * - lastName: Mínimo 1 carácter, máximo requerido
 * - Ambos campos validados con updateProfileSchema
 *
 * **Estados Internos**:
 * - `isLoading`: Boolean indicando si está enviando el formulario
 * - `form`: Estado del formulario con react-hook-form
 *
 * **Flujo**:
 * 1. Componente carga con datos iniciales del usuario
 * 2. Usuario modifica nombre y/o apellido
 * 3. En submit: valida datos con schema
 * 4. Envía PATCH a /api/customer/profile
 * 5. Si exitoso: muestra toast de éxito, redirecciona
 * 6. Si error: muestra toast con mensaje de error
 *
 * **API Integration**:
 * - Endpoint: PATCH /api/customer/profile
 * - Body: { firstName, lastName }
 * - Auth: Requiere sesión autenticada
 * - Response: { success: boolean, message?: string }
 *
 * **Seguridad**:
 * - Validación de entrada con Zod
 * - No envía datos no modificados
 * - Manejo de errores sin exponer información sensible
 * - Toast notifications seguras
 *
 * @example
 * ```tsx
 * // En página de configuración
 * import { ProfileForm } from '@/modules/admin/components/containers/profile-form-container'
 * import { getUserProfile } from '@/lib/queries'
 *
 * export default async function SettingsPage() {
 *   const user = await getUserProfile(userId)
 *   return <ProfileForm user={user} />
 * }
 * ```
 *
 * @see {@link updateProfileSchema} para validaciones
 * @see {@link UserProfile} para estructura de datos
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateProfileSchema } from '@/modules/shared/validations';
import type { UserProfile, UpdateProfileData } from '@/modules/admin/types';
import { API_ROUTES } from '@/modules/shared/constants/api-routes';
import { Loader2, User } from 'lucide-react';

interface ProfileFormProps {
  user: UserProfile;
  onSuccess?: () => void;
}

export function ProfileForm({ user, onSuccess }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateProfileData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    },
  });

  async function onSubmit(data: UpdateProfileData) {
    setIsLoading(true);

    try {
      const response = await fetch(API_ROUTES.CUSTOMER_PROFILE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar perfil');
      }

      toast.success('Perfil actualizado', {
        description: 'Tu información personal ha sido actualizada correctamente.',
      });

      // Refrescar los datos de la página
      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar perfil', {
        description:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al actualizar tu perfil. Intenta de nuevo.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información Personal
        </CardTitle>
        <CardDescription>
          Actualiza tu nombre y apellido. Estos datos se mostrarán en tu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email (readonly) */}
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </FormControl>
              <p className="text-sm text-muted-foreground">
                El correo electrónico no se puede modificar.
              </p>
            </FormItem>

            {/* Nombre */}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Juan"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Apellido */}
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Pérez"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botón Submit */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
