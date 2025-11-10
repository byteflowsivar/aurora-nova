// /application-base/src/app/auth/reset-password/page.tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';

// Un componente wrapper para manejar la lógica del token de forma segura en el cliente
function ResetPasswordWrapper({ token }: { token: string | undefined }) {
  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-destructive">Token no válido o ausente</h2>
        <p className="text-sm text-muted-foreground mt-2">
          El enlace de reinicio de contraseña no es válido o ha expirado. Por favor, solicita uno nuevo.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/forgot-password">Solicitar nuevo enlace</Link>
        </Button>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

// El componente de la página que usa Suspense para leer los searchParams
function ResetPasswordContent({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Establece tu nueva contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Elige una contraseña segura que no hayas usado antes.
          </p>
        </div>
        
        <ResetPasswordWrapper token={token} />

      </div>
    </div>
  );
}

// La página principal que exportamos, envuelta en Suspense
export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}
