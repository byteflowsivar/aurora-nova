'use client';

/**
 * Formulario de Perfil de Usuario
 * Permite actualizar nombre y apellido
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
import { updateProfileSchema } from '@/lib/validations/profile-schema';
import type { UserProfile, UpdateProfileData } from '@/lib/types/profile';
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
      const response = await fetch('/api/user/profile', {
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
