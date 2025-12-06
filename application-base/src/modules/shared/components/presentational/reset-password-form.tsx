/**
 * Componente ResetPasswordForm
 *
 * Formulario para restablecer contraseña del usuario.
 * Permite que un usuario ingrese una nueva contraseña usando un token
 * de reinicio válido. Valida que las contraseñas coincidan y tienen
 * longitud mínima.
 *
 * Este componente es responsable de:
 * - Recolectar nueva contraseña y confirmación
 * - Validar que las contraseñas coinciden
 * - Validar requisitos de contraseña (longitud mínima)
 * - Enviar solicitud de cambio a API `/api/auth/reset-password`
 * - Mostrar confirmación tras éxito
 * - Redirigir a login tras cambio exitoso
 *
 * **Características**:
 * - Validación con Zod Schema (coincidencia y longitud)
 * - Manejo robusto de errores
 * - Toast notifications para errores
 * - Mensaje de confirmación tras cambio exitoso
 * - Link de retorno a login
 * - Loading state durante envío
 * - Integración con shadcn/ui Form components
 *
 * @component
 * @returns {JSX.Element} Formulario de reinicio de contraseña
 *
 * @param {Object} props - Props del componente
 * @param {string} props.token - Token de reinicio extraído de URL (query param)
 *
 * **Props Requeridas**:
 * - `token` (string): Token de reinicio de contraseña válido (extraído de URL)
 *
 * **Estados Internos**:
 * - `isLoading`: Indica si está enviando la solicitud
 * - `isSuccess`: Indica si el cambio fue exitoso (muestra confirmación)
 *
 * **Validaciones**:
 * - Password: mínimo 8 caracteres
 * - ConfirmPassword: debe coincidir exactamente con password
 * - Ambos campos son requeridos
 *
 * **Flujo**:
 * 1. Usuario recibe enlace con token en email
 * 2. Ingresa nueva contraseña dos veces
 * 3. Validación local con Zod
 * 4. POST a `/api/auth/reset-password` con token y password
 * 5. Si exitoso, muestra confirmación y link a login
 * 6. Si falla, muestra toast con error
 *
 * **Seguridad**:
 * - Token validado en servidor antes de permitir cambio
 * - Token tiene expiración (30 minutos)
 * - Contraseña nunca se valida en cliente completamente
 * - API endpoint verifica token hasheado
 * - Requiere que usuario haga login con nueva contraseña
 *
 * **Estados UI**:
 * - Inicial: formulario con 2 campos de contraseña
 * - Enviando: botón deshabilitado con estado "Actualizando..."
 * - Éxito: mensaje de confirmación con link a login
 * - Error: toast notification con descripción del error
 *
 * @example
 * ```tsx
 * // En página de reset-password
 * import { ResetPasswordForm } from '@/modules/shared/components/presentational/reset-password-form';
 *
 * export default function ResetPasswordPage({
 *   searchParams,
 * }: {
 *   searchParams: { token?: string };
 * }) {
 *   const token = searchParams.token || '';
 *
 *   if (!token) {
 *     return <div>Token inválido</div>;
 *   }
 *
 *   return (
 *     <div className="container max-w-sm">
 *       <h1>Restablecer Contraseña</h1>
 *       <ResetPasswordForm token={token} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link requestPasswordReset} para solicitar token de reinicio
 * @see {@link validatePasswordResetToken} para validar token
 * @see {@link ForgotPasswordForm} para solicitud inicial
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import Link from 'next/link';

const ResetPasswordSchema = z.object({
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Algo salió mal. Por favor, inténtalo de nuevo.');
      }
      
      toast.success('¡Tu contraseña ha sido actualizada exitosamente!');
      setIsSuccess(true);

    } catch (error) {
      toast.error((error as Error).message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold">Contraseña Actualizada</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Tu contraseña ha sido cambiada. Ahora puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/auth/signin">Ir a Inicio de Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="********"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Nueva Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="********"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Restablecer Contraseña'}
        </Button>
      </form>
    </Form>
  );
}
