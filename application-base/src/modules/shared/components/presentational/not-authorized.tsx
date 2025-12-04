// src/components/auth/not-authorized.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export function NotAuthorized() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
          <CardTitle className="mt-4 text-2xl font-bold">Acceso Denegado</CardTitle>
          <CardDescription>
            No tienes los permisos necesarios para acceder a esta página.
            Por favor, contacta al administrador del sistema si crees que esto es un error.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Volver a la página principal o iniciar sesión con una cuenta diferente.
        </CardContent>
      </Card>
    </div>
  );
}
