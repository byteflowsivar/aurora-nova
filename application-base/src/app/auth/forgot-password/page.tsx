// /application-base/src/app/auth/forgot-password/page.tsx
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-sm text-muted-foreground">
            No te preocupes. Introduce tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>
        
        <ForgotPasswordForm />

        <div className="text-center text-sm">
          <Link href="/auth/signin" className="underline text-muted-foreground hover:text-primary">
            Volver a inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
