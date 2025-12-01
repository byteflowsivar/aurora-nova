# Plan de Trabajo: Refactorización a Zonas Pública y de Administración

**Proyecto:** Aurora Nova - Application Base
**Fecha**: 2025-11-30
**Estado**: 📝 Pendiente

---

## 1. Visión General

### Objetivo
Refactorizar la aplicación para establecer una arquitectura de zonas explícita, mejorando la separación de incumbencias, la seguridad y la experiencia de usuario. Las zonas serán:
1.  **Zona Pública**: Para visitantes no autenticados.
2.  **Zona de Cliente**: Para usuarios autenticados no-administradores (ej. "Mi Cuenta").
3.  **Panel de Administración**: Un área `/admin` estrictamente protegida para la gestión del sistema.

### Entregables Clave
-   Estructura de rutas basada en grupos.
-   Layout público con cabecera y modal de login social.
-   Sistema de menús multi-contexto (`ADMIN_PANEL`, `PUBLIC_SITE`).
-   Manejo de errores global con páginas personalizadas.
-   Actualización de estándares de desarrollo para reflejar la nueva arquitectura.

---

## 2. Plan de Ejecución Detallado

### Paso 1: Preparación y Estándares

1.  **Crear una nueva rama** para aislar los cambios:
    ```bash
    git checkout -b feature/refactor-public-admin-split
    ```
2.  **Actualizar Estándares de Arquitectura**: Como acordamos, se ha actualizado `ai-specs/specs/nextjs-standards.mdc` para hacer mandatorio que todos los componentes, incluidos los Server Components, consuman datos a través de las API Routes internas.

### Paso 2: Implementar Layout Público y Autenticación Social

1.  **Crear el Layout Público**:
    Crea el archivo `application-base/src/app/(public)/layout.tsx` con una estructura que incluya una cabecera y el contenido principal.

    ```tsx
    // src/app/(public)/layout.tsx
    import { PublicHeader } from '@/components/layout/public-header';

    export default function PublicLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <div className="flex min-h-screen flex-col">
          <PublicHeader />
          <main className="flex-1">{children}</main>
          {/* Aquí podría ir un footer público en el futuro */}
        </div>
      );
    }
    ```

2.  **Crear el Componente de Cabecera Pública**:
    Este componente contendrá el botón que activa el modal de login.

    ```tsx
    // src/components/layout/public-header.tsx
    'use client'; // Necesita ser cliente por el modal interactivo
    import { Button } from '@/components/ui/button';
    import { SocialLoginModal } from '@/components/auth/social-login-modal';
    import { useState } from 'react';

    export function PublicHeader() {
      const [isModalOpen, setIsModalOpen] = useState(false);

      return (
        <>
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <span className="font-bold">Aurora Nova</span>
              <div className="flex flex-1 items-center justify-end space-x-4">
                <Button onClick={() => setIsModalOpen(true)}>Iniciar Sesión</Button>
              </div>
            </div>
          </header>
          <SocialLoginModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </>
      );
    }
    ```

3.  **Crear el Modal de Login Social**:
    Este componente usará el `Dialog` de `shadcn/ui` y los métodos de `next-auth`.

    ```tsx
    // src/components/auth/social-login-modal.tsx
    'use client';
    import { signIn } from 'next-auth/react';
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
    // Asumimos que tienes iconos para Google y Facebook
    // import { GoogleIcon, FacebookIcon } from '@/components/ui/icons';

    export function SocialLoginModal({ open, onOpenChange }) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Sesión</DialogTitle>
              <DialogDescription>
                Elige un método para continuar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4 pt-4">
              <Button variant="outline" onClick={() => signIn('google')}>
                {/* <GoogleIcon className="mr-2 h-5 w-5" /> */}
                Continuar con Google
              </Button>
              <Button variant="outline" disabled>
                {/* <FacebookIcon className="mr-2 h-5 w-5" /> */}
                Continuar con Facebook (Próximamente)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    ```

4.  **Configurar Proveedores de Auth.js**:
    Modifica `application-base/src/lib/auth.ts` para incluir los nuevos proveedores.

    ```typescript
    // src/lib/auth.ts
    import GoogleProvider from "next-auth/providers/google";
    // import FacebookProvider from "next-auth/providers/facebook";
    
    // ... dentro de la configuración de NextAuth
    providers: [
      // ... CredentialsProvider existente
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      // FacebookProvider({
      //   clientId: process.env.FACEBOOK_CLIENT_ID!,
      //   clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      // }),
    ]
    // ...
    ```

5.  **Actualizar Variables de Entorno**:
    Añade las siguientes variables a `.env.local` y `.env.example`. **Deberás obtener estas credenciales desde la consola de desarrolladores de Google y Facebook.**

    ```env
    # .env.example
    
    # Proveedores OAuth
    GOOGLE_CLIENT_ID=""
    GOOGLE_CLIENT_SECRET=""
    # FACEBOOK_CLIENT_ID=""
    # FACEBOOK_CLIENT_SECRET=""
    ```

### Paso 3: Adaptar el Sistema de Menú Dinámico
(Este paso implementa tu sugerencia de `context` y `type`).

1.  **Modificar el Esquema Prisma**:
    Abre `application-base/prisma/schema.prisma` y añade los enums `MenuContext` y `MenuType`, y los nuevos campos al modelo `MenuItem`.

    ```prisma
    // application-base/prisma/schema.prisma
    
enum MenuContext {
      ADMIN_PANEL
      PUBLIC_SITE
      CUSTOMER_PORTAL
    }
    
enum MenuType {
      SIDEBAR
      HEADER
      FOOTER
    }
    
    model MenuItem {
      id           String      @id @default(dbgenerated("uuidv7()")) @db.Uuid
      context      MenuContext @default(ADMIN_PANEL) // 👈 NUEVO CAMPO: Contexto
      type         MenuType    @default(SIDEBAR)   // 👈 NUEVO CAMPO: Tipo de menú
      title        String      @db.VarChar(100)
      // ... resto de los campos ...
    
      @@index([context, type]) // Añadir un índice compuesto para optimizar búsquedas
    }
    ```

2.  **Aplicar la Migración a la Base de Datos**:
    ```bash
    # Desde la carpeta application-base/
    npx prisma migrate dev --name add_menu_context_and_type
    ```

3.  **Actualizar el Seeder de Menú**:
    Modifica `application-base/prisma/seeds/menu-items.ts` para asignar el contexto y tipo a los ítems existentes.

    ```typescript
    // application-base/prisma/seeds/menu-items.ts
    import { PrismaClient, MenuContext, MenuType } from '../../src/lib/prisma/generated';
    
    // ...
    const dashboard = await prisma.menuItem.create({
      data: {
        context: MenuContext.ADMIN_PANEL, // 👈 Asignar contexto
        type: MenuType.SIDEBAR,           // 👈 Asignar tipo
        title: 'Dashboard',
        // ... resto de datos
      }
    });
    // Repetir para todos los demás items del seeder...
    ```

4.  **Refactorizar las Queries del Menú**:
    Actualiza `application-base/src/lib/prisma/menu-queries.ts` para que la función principal filtre por contexto y tipo.

    ```typescript
    // application-base/src/lib/prisma/menu-queries.ts
    import { MenuContext, MenuType } from '@/lib/prisma/generated'; // Importar enums
    
    export async function getMenuForUser(
      userId: string,
      context: MenuContext,
      type: MenuType
    ): Promise<MenuItem[]> {
      const userPermissions = await getUserPermissions(userId);
      const allMenuItems = await prisma.menuItem.findMany({
        where: {
          isActive: true,
          context: context, // 👈 Filtrar por contexto
          type: type,       // 👈 Filtrar por tipo
        },
        orderBy: { order: 'asc' },
      });
      // ... el resto de la lógica de filtrado por permisos y jerarquía no cambia
    }
    ```
    Del mismo modo, actualiza `getMenuServer` y la lógica de caché para pasar y usar estos nuevos parámetros.

### Paso 4: Reestructurar el Panel de Administración

1.  **Crear directorios**: `mkdir -p application-base/src/app/\(admin\)/admin` y `mkdir -p application-base/src/app/\(customer\)/account`.
2.  **Mover páginas protegidas**: Mover `dashboard`, `users`, `roles`, etc., a `src/app/(admin)/admin/`.
3.  **Mover página de `settings`**: Mover `settings` a `src/app/(customer)/account/`.
4.  **Mover y renombrar layout**: Mover `(protected)/layout.tsx` a `(admin)/layout.tsx`.
5.  **Eliminar `(protected)`**: `rm -rf application-base/src/app/\(protected\)`

### Paso 5: Fortalecer la Seguridad del Layout de Administración

1.  **Modificar `application-base/src/app/(admin)/layout.tsx`**:
    El layout ahora debe verificar el rol y solicitar el menú correcto.

    ```tsx
    // src/app/(admin)/layout.tsx
    import { auth } from "@/lib/auth";
    import { redirect } from "next/navigation";
    import { AppSidebar } from "@/components/layout/app-sidebar";
    import { getMenuServer } from "@/lib/menu/get-menu-server";
    import { requireAnyPermission } from "@/lib/server/require-permission";
    import { NotAuthorized } from "@/components/auth/not-authorized";
    import { MenuContext, MenuType } from "@/lib/prisma/generated"; // 👈 Importar enums
    // ... otros imports ...
    
    export default async function AdminLayout({ children }: { children: React.ReactNode }) {
      const session = await auth();
      if (!session?.user) redirect("/auth/signin");
    
      try {
        // Verificar que el usuario tenga permisos de administrador
        await requireAnyPermission(['user:list', 'role:list', 'system:admin']);
      } catch (error) {
        return <NotAuthorized />;
      }
    
      // 👇 Solicitar el menú específico para el panel de administración
      const menuItems = await getMenuServer(session.user.id, MenuContext.ADMIN_PANEL, MenuType.SIDEBAR);
    
      return (
        // ... resto del layout ...
        <AppSidebar menuItems={menuItems} />
        // ...
      );
    }
    ```

### Paso 6: Implementar Manejo de Errores Global

1.  **Crear Página `not-found.tsx`**:
    ```tsx
    // src/app/not-found.tsx
    import Link from 'next/link';
    import { Button } from '@/components/ui/button';

    export default function NotFound() {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center text-center">
          <h1 className="text-6xl font-bold">404</h1>
          <h2 className="mt-4 text-2xl font-semibold">Página No Encontrada</h2>
          <p className="mt-2 text-muted-foreground">Lo sentimos, no pudimos encontrar la página que buscas.</p>
          <Button asChild className="mt-6">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </div>
      );
    }
    ```

2.  **Crear Página `error.tsx`**:
    ```tsx
    // src/app/error.tsx
    'use client';
    import { Button } from '@/components/ui/button';
    import { useEffect } from 'react';

    export default function Error({
      error,
      reset,
    }: {
      error: Error & { digest?: string };
      reset: () => void;
    }) {
      useEffect(() => {
        // Aquí se podría integrar un servicio de logging de errores como Sentry
        console.error(error);
      }, [error]);

      return (
        <div className="flex min-h-screen flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-destructive">Algo salió mal</h1>
          <p className="mt-4 text-muted-foreground">
            Ocurrió un error inesperado. Por favor, intenta de nuevo.
          </p>
          <Button onClick={() => reset()} className="mt-6">
            Intentar de Nuevo
          </Button>
        </div>
      );
    }
    ```

### Paso 7: Verificación Final

1.  **Revisar `proxy.ts`** para asegurar que las rutas públicas y protegidas (`/admin/*`, `/account/*`) estén configuradas correctamente.
2.  **Probar todos los flujos**:
    -   Acceso público sin login y uso del modal de login social.
    -   Login con un usuario normal y acceso denegado a `/admin/*`.
    -   Acceso a `/account/settings` para un usuario normal.
    -   Login como admin y acceso completo a `/admin/*`.
    -   Visualización de páginas 404 y de error personalizadas.