// /application-base/src/components/auth/reset-password-form.tsx
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
          <Link href="/auth/signin">Ir a Inicio de Sesión</Link>
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
