// /application-base/src/components/auth/forgot-password-form.tsx
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
