// /application-base/src/app/auth/reset-password/page.tsx
'use client'; // Convertimos la página en un Client Component

import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Componente que contiene la lógica de validación del lado del cliente
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Estados para manejar el flujo de validación
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setIsTokenValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();
        setIsTokenValid(data.valid);
      } catch (error) {
        console.log('Error al validar el token:', error);
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  // Renderiza el contenido principal
  const renderContent = () => {
    if (isValidating) {
      return <div>Validando enlace...</div>;
    }

    if (isTokenValid && token) {
      return <ResetPasswordForm token={token} />;
    }

    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-destructive">Enlace no válido o expirado</h2>
        <p className="text-sm text-muted-foreground mt-2">
          El enlace de reinicio de contraseña no es válido o ha expirado. Por favor, solicita uno nuevo.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/forgot-password">Solicitar nuevo enlace</Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Establece tu nueva contraseña
        </h1>
        <p className="text-sm text-muted-foreground">
          {isValidating ? 'Un momento...' : 'Elige una contraseña segura que no hayas usado antes.'}
        </p>
      </div>
      {renderContent()}
    </div>
  );
}

// El componente de la página principal ahora solo envuelve todo en Suspense
// para asegurar que useSearchParams funcione correctamente.
export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Suspense fallback={<div>Cargando...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
