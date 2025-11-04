'use client';

/**
 * Formulario de Cambio de Contraseña
 * Permite cambiar la contraseña del usuario con validaciones de seguridad
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
import { changePasswordSchema } from '@/lib/validations/profile-schema';
import type { ChangePasswordData } from '@/lib/types/profile';
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
      const response = await fetch('/api/user/change-password', {
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
            // Redirigir al login
            router.push('/auth/signin');
            router.refresh();
          } else {
            // Si falla el logout, forzar recarga completa
            window.location.href = '/auth/signin';
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
