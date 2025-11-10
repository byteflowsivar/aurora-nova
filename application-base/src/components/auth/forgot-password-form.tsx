// /application-base/src/components/auth/forgot-password-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Algo salió mal. Por favor, inténtalo de nuevo.');
      }
      
      // Mostramos el mensaje de éxito independientemente de si el email existe o no
      setIsSubmitted(true);

    } catch (error) {
      toast.error((error as Error).message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
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
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar enlace de reinicio'}
        </Button>
      </form>
    </Form>
  );
}
