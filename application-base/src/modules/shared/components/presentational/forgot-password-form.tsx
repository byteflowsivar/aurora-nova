/**
 * Componente ForgotPasswordForm
 *
 * Formulario para solicitar reinicio de contraseña.
 * Permite a usuarios ingresar su email para recibir un enlace de reinicio
 * de contraseña. Utiliza react-hook-form para validación y server action
 * para el proceso de solicitud.
 *
 * Este componente es responsable de:
 * - Recolectar email del usuario
 * - Validación de formato de email con Zod
 * - Llamada a server action `requestPasswordReset()`
 * - Manejo de estados pending durante la solicitud
 * - Mostrar mensaje de confirmación
 *
 * **Características**:
 * - Validación con Zod Schema
 * - Manejo de transiciones con useTransition
 * - Toast notifications para errores
 * - Mensaje de confirmación tras envío exitoso
 * - Anti-enumeración: no revela si email existe o no
 * - Integración con shadcn/ui Form components
 * - Loading state en botón durante submit
 *
 * @component
 * @returns {JSX.Element} Formulario de recuperación de contraseña
 *
 * **Props**: Ninguno (sin props requeridas)
 *
 * **Estados Internos**:
 * - `isPending`: Indica si está procesando la solicitud
 * - `isSubmitted`: Indica si ya fue enviada la solicitud (muestra confirmación)
 *
 * **Flujo**:
 * 1. Usuario ingresa su email
 * 2. Validación con Zod Schema
 * 3. Submit llama a `requestPasswordReset()` server action
 * 4. Si exitoso, muestra mensaje de confirmación
 * 5. Si falla, muestra toast con error
 * 6. Mensaje de confirmación no revela si email existe (anti-enumeración)
 *
 * **Seguridad**:
 * - Email validado en cliente y servidor
 * - Server action `requestPasswordReset()` usa anti-enumeración
 * - Token de reset hasheado y almacenado en BD
 * - Token tiene fecha de expiración (30 minutos)
 * - Nunca revela si un email está registrado
 *
 * **Mensajes Mostrados**:
 * - Antes de envío: formulario con campo email
 * - Después de envío: "Revisa tu correo" con mensaje seguro
 * - Si error: toast con descripción del error
 *
 * @example
 * ```tsx
 * // En página de forgot-password
 * import { ForgotPasswordForm } from '@/modules/shared/components/presentational/forgot-password-form';
 *
 * export default function ForgotPasswordPage() {
 *   return (
 *     <div className="container max-w-sm">
 *       <h1>Recuperar Contraseña</h1>
 *       <ForgotPasswordForm />
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link requestPasswordReset} para la server action
 * @see {@link validatePasswordResetToken} para validación del token
 * @see {@link ResetPasswordForm} para el formulario de reinicio
 */

'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { requestPasswordReset } from '@/actions/auth'; // Importar la Server Action

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    startTransition(async () => {
      try {
        const result = await requestPasswordReset(data);

        if (!result.success) {
          throw new Error(result.error || 'Algo salió mal.');
        }
        
        // Mostramos el mensaje de éxito
        setIsSubmitted(true);

      } catch (error) {
        toast.error((error as Error).message || 'Ocurrió un error inesperado.');
      }
    });
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold">Revisa tu correo</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Si tu cuenta existe, hemos enviado un enlace a tu dirección de correo electrónico para restablecer tu contraseña.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Enviando...' : 'Enviar enlace de reinicio'}
        </Button>
      </form>
    </Form>
  );
}
