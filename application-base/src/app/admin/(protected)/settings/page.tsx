/**
 * Página de Configuración de Perfil
 * Permite al usuario gestionar su información personal y seguridad
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/modules/shared/api';
import { ProfileFormContainer, ChangePasswordFormContainer, AccountInfoContainer } from '@/modules/admin/components/containers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/admin/auth/signin');
  }

  const profile = await getUserProfile(session.user.id);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Configuración de Perfil
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu información personal y configuración de seguridad
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Columna Izquierda */}
        <div className="space-y-6">
          {/* Formulario de Perfil */}
          <ProfileFormContainer user={profile} />

          {/* Información de Cuenta */}
          <AccountInfoContainer user={profile} />
        </div>

        {/* Columna Derecha */}
        <div>
          {/* Cambio de Contraseña */}
          {profile.hasCredentials ? (
            <ChangePasswordFormContainer />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Cambio de Contraseña
                </CardTitle>
                <CardDescription>
                  Esta cuenta utiliza autenticación externa (OAuth)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tu cuenta está vinculada con un proveedor de autenticación
                  externo (como Google, GitHub, etc.). No es posible cambiar la
                  contraseña desde aquí.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Para gestionar tu contraseña, dirígete a la configuración de
                  tu cuenta en el proveedor de autenticación que utilizas.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
