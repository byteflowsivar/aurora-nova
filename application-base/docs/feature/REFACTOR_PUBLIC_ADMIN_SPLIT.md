# Plan de Trabajo: Refactorización a Zonas Pública y de Administración

**Proyecto:** Aurora Nova - Application Base
**Fecha de Creación**: 2025-11-30
**Última Actualización**: 2025-12-04
**Estado**: 🚀 En Progreso - Fases 3a-3e Completadas

---

## 📊 Estado de Progreso

### ✅ Completado (Fases 3a-3e)

**Arquitectura Modular - Refactorización de Módulos Admin y Shared:**

1. **Fase 3a - Organización de Hooks** ✓
   - Movidos hooks de autenticación y permisos a `/src/modules/shared/hooks/`
   - Movidos hooks específicos de auditoría a `/src/modules/admin/hooks/`
   - Implementados nuevos hooks: `useAnyPermission`, `useAllPermissions`, `useIsAdmin`
   - Creados índices con re-exports

2. **Fase 3b - Organización de Tipos** ✓
   - Movidos tipos compartidos (auth, session, action-response) a `/src/modules/shared/types/`
   - Movidos tipos específicos de admin (permissions, menu, profile) a `/src/modules/admin/types/`
   - Actualizado 20+ imports en toda la aplicación

3. **Fase 3c - Organización de Servicios** ✓
   - Movidos servicios de auditoría a `/src/modules/admin/services/`
   - Movidos servicios de API y email a `/src/modules/shared/api/`
   - Resueltos conflictos de tipos duplicados

4. **Fase 3d - Organización de Queries Prisma** ✓
   - Movidas queries de usuarios y sesiones a `/src/modules/shared/api/`
   - Movidas queries de permisos y menú a `/src/modules/admin/services/`

5. **Fase 3e - Organización de Utilidades y Validaciones** ✓
   - Movidas utilidades de permisos a `/src/modules/admin/utils/`
   - Movidas utilidades de sesión a `/src/modules/shared/utils/`
   - Movidas validaciones a `/src/modules/shared/validations/`
   - Resuelto conflicto de exports (changePasswordSchema)
   - Separación cliente/servidor en barrel files

**Estadísticas:**
- ✓ 40+ imports actualizados
- ✓ 13+ archivos y directorios eliminados de `/src/lib/`
- ✓ Build exitoso (29 rutas)
- ✓ Lint sin errores
- ✓ TypeScript validado
- ✓ Merge exitoso a rama `main`

---

### ⏳ Pendiente - Próximas Fases

#### Fase 4 - Revisar y Organizar API REST Endpoints ⚠️
**Estado**: No iniciado
**Descripción**:
- Reorganizar y separar endpoints API por contextos (public, customer, admin)
- Revisar estructura actual de `/src/app/api/`
- Implementar separación lógica según el plan de Paso 5.2
- Validar protecciones y autorización en cada endpoint

**Archivos afectados**: `/src/app/api/**`

#### Fase 5 - Revisar y Organizar Plantillas Mustache ⚠️
**Estado**: No iniciado
**Descripción**:
- Auditoría de plantillas Mustache en `/templates/`
- Separación de plantillas por contexto (si aplica)
- Validación de variables disponibles
- Organización y documentación

**Archivos afectados**: `/templates/**`

---

## 1. Visión General

### Objetivo
Refactorizar la aplicación para establecer una arquitectura de zonas explícita, mejorando la separación de incumbencias, la seguridad y la experiencia de usuario. Las zonas serán:
1.  **Zona Pública**: Para visitantes no autenticados.
2.  **Zona de Cliente**: Para usuarios autenticados con rol "Usuario" en la parte pública (ej. "Mi Cuenta").
3.  **Panel de Administración**: Un área `/admin` estrictamente protegida para la gestión del sistema, accesible solo para roles administrativos.

### Entregables Clave
-   Estructura de rutas basada en grupos.
-   Layout público con cabecera y modal de login social.
-   Sistema de menús multi-contexto (`ADMIN_PANEL`, `PUBLIC_SITE`, `CUSTOMER_PORTAL`).
-   Manejo de errores global con páginas personalizadas.
-   **Estrategia de protección de rutas validada**: Se confirma que la implementación existente de **`proxy.ts`** para la autenticación global (comprobación de sesión y redirección) está alineada con las mejores prácticas de Next.js 16. La **autorización granular** (verificación de permisos específicos) continuará manejándose en los **Server Components (Layouts)**, lo que asegura una seguridad robusta y modular.
-   **Separación lógica de API Routes** por zonas (pública, cliente, administración).
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

1.  **Crear el Layout Público (`src/app/(public)/layout.tsx`)**:
    Este layout será una adaptación del `application-base/src/app/(protected)/layout.tsx`. Deberá obtener el estado de la sesión y pasar la información necesaria a `AppSidebar` para la renderización condicional. A diferencia del layout protegido, este **no redirigirá** si el usuario no está autenticado, sino que adaptará su interfaz.

    ```tsx
    // src/app/(public)/layout.tsx
    import { auth } from "@/lib/auth";
    import { AppSidebar } from "@/components/layout/app-sidebar";
    import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
    import { Separator } from "@/components/ui/separator";
    import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
    import { getMenuServer } from "@/lib/menu/get-menu-server";
    import { Toaster } from "@/components/ui/sonner";
    import { MenuContext, MenuType } from "@/lib/prisma/generated"; // Importar enums
    import type { Session } from 'next-auth'; // Importar tipo de sesión

    export default async function PublicLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      const session: Session | null = await auth();
      
      let menuItems = [];
      if (session?.user) {
        // Si hay sesión, cargar el menú del portal de cliente
        menuItems = await getMenuServer(session.user.id, MenuContext.CUSTOMER_PORTAL, MenuType.SIDEBAR);
      } else {
        // Si no hay sesión, cargar un menú público base (que podría incluir una opción de login)
        menuItems = await getMenuServer(null, MenuContext.PUBLIC_SITE, MenuType.SIDEBAR);
      }

      return (
        <SidebarProvider>
          {/* Se pasará la sesión y los menuItems a AppSidebar */}
          <AppSidebar menuItems={menuItems} session={session} />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Aurora Nova</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {children}
            </div>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
      );
    }
    ```

2.  **Crear o Adaptar Componentes de la Interfaz Pública**:
    *   **Adaptar `AppSidebar`**: El componente `application-base/src/components/layout/app-sidebar.tsx` necesitará ser modificado para aceptar la prop `session` y renderizar condicionalmente las opciones de "Iniciar Sesión" (si `session` es `null`) o el menú de perfil/gestión de cuenta (si `session` existe). Esto podría implicar la creación de un `SidebarFooter` o un componente similar dentro de `AppSidebar` para manejar esta lógica.
    *   **`SocialLoginModal`**: Este modal seguirá siendo necesario y probablemente se activará desde un botón "Iniciar Sesión" dentro de la `AppSidebar` cuando el usuario no esté autenticado.

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

### Paso 5: Fortalecer la Seguridad del Layout de Administración (Autorización Granular)

1.  **Modificar `application-base/src/app/(admin)/layout.tsx`**:
    La protección de rutas para la zona administrativa se basa en dos capas:
    *   **Autenticación Global**: Gestionada por `proxy.ts`, que asegura que el usuario tenga una sesión activa antes de acceder a cualquier ruta protegida (incluyendo `/admin/*`).
    *   **Autorización Granular**: Se realiza en este Server Component (`layout.tsx`), verificando los permisos específicos del usuario para acceder a las funcionalidades administrativas.

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
      // Aunque proxy.ts ya redirige si no hay sesión, esta verificación adicional aquí es un buen respaldo
      // y clarifica la intención de seguridad del layout.
      if (!session?.user) redirect("/auth/signin");
    
      try {
        // Verificar que el usuario tenga permisos de administrador.
        // Si no los tiene, se lanzará una excepción que será capturada, mostrando NotAuthorized.
        await requireAnyPermission(['user:list', 'role:list', 'system:admin']);
      } catch (error) {
        // En caso de no tener permisos suficientes, se muestra un componente indicando acceso denegado.
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
    **Nota sobre Protección de Rutas**: `proxy.ts` gestiona la capa de autenticación a nivel global (comprobando `session?.user`). Los Server Components de los layouts complementan esta seguridad realizando comprobaciones de autorización granular (permisos específicos para la ruta) y manejando la experiencia de usuario (redirecciones o visualización de `NotAuthorized`).

### Paso 5.1: Implementar Layout y Protección para la Zona de Cliente

1.  **Crear el Layout de Cliente**:
    Crea el archivo `application-base/src/app/(customer)/account/layout.tsx`. Este layout debe tener una estructura similar al público, pero diseñada para usuarios logueados.

    ```tsx
    // src/app/(customer)/account/layout.tsx
    import { auth } from "@/lib/auth";
    import { redirect } from "next/navigation";
    import { PublicHeader } from '@/components/layout/public-header'; // O una cabecera de cliente específica
    import { NotAuthorized } from "@/components/auth/not-authorized";
    // Si necesitas un menú específico para el cliente, puedes importarlo aquí
    // import { getMenuServer } from "@/lib/menu/get-menu-server";
    // import { MenuContext, MenuType } from "@/lib/prisma/generated";
    
    export default async function CustomerAccountLayout({ children }: { children: React.ReactNode }) {
      const session = await auth();
      // Si no hay sesión, redirigir a la página de inicio de sesión pública
      if (!session?.user) redirect("/auth/signin");
    
      // Opcional: Verificar el rol "Usuario" o permisos específicos para esta zona
      // try {
      //   await requireAnyPermission(['customer:access', 'user:profile']);
      // } catch (error) {
      //   return <NotAuthorized />;
      // }
    
      // Si el rol "Usuario" es mandatorio para esta zona, se podría verificar aquí
      // const isUserRole = session.user.roles?.includes('Usuario'); // Asumiendo que el rol se inyecta en la sesión
      // if (!isUserRole) {
      //   return <NotAuthorized message="Acceso denegado: Se requiere rol de Usuario." />;
      // }

      return (
        <div className="flex min-h-screen flex-col">
          <PublicHeader /> {/* O un CustomerHeader específico si es necesario */}
          <main className="flex-1 container mx-auto py-8">{children}</main>
          {/* Aquí podría ir un footer de cliente */}
        </div>
      );
    }
    ```
    **Nota**: La página `settings` actual (que estaba en `src/app/(protected)/settings`) se moverá a `src/app/(admin)/admin/settings` como parte del panel administrativo. La zona `(customer)/account` está pensada para funcionalidades del usuario público logueado.

### Paso 5.2: Estrategia de Separación de API Routes

Para mantener la organización y seguridad, las rutas de API se organizarán lógicamente por zonas dentro del directorio `src/app/api/`. Esto permite aplicar seguridad y lógica específica a cada grupo de APIs.

1.  **Reestructurar `src/app/api/`**:
    *   **API Públicas**: Se moverán a `src/app/api/(public)/`. Por ejemplo, APIs de autenticación, o datos públicos.
    *   **API de Cliente**: Se moverán a `src/app/api/(customer)/account/` o `src/app/api/(customer)/profile/`. Estas requerirán autenticación de usuario (`session.user`).
    *   **API de Administración**: Se moverán a `src/app/api/(admin)/`. Estas requerirán autenticación de usuario y permisos específicos de administrador.

    Ejemplo de estructura:
    ```
    src/app/api/
    ├── (public)/
    │   ├── auth/
    │   │   └── route.ts
    │   └── products/
    │       └── route.ts
    ├── (customer)/
    │   ├── account/
    │   │   └── route.ts
    │   └── orders/
    │       └── route.ts
    └── (admin)/
        ├── users/
        │   └── route.ts
        └── roles/
            └── route.ts
    ```
    **Nota**: Esta separación es lógica. La implementación de la autorización (ej. `requireAnyPermission` o `auth()`) se realizará en cada archivo `route.ts` según sea necesario.

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

---

## 📝 Notas Para Continuar (Próxima Sesión)

### Contexto de Retorno
Las Fases 3a-3e (Arquitectura Modular) han sido completadas exitosamente. La rama `core-auth` ha sido mergeada a `main`. El siguiente paso es continuar con la organización de API endpoints y plantillas Mustache.

### Checklist Para Mañana

#### Antes de Iniciar:
- [ ] Verificar rama actual: `git status`
- [ ] Actualizar rama main: `git pull origin main`
- [ ] Confirmar que última versión incluye los cambios de arquitectura modular
- [ ] Ejecutar `npm run build` y `npm run lint` para validar estado actual

#### Fase 4 - API REST Endpoints:
**Ruta**: `/src/app/api/`
**Objetivo**: Organizar endpoints por contextos (public, customer, admin)

**Tareas**:
1. Listar y auditar todos los endpoints actuales
2. Clasificar cada endpoint por contexto:
   - Public (sin autenticación)
   - Customer (usuario autenticado)
   - Admin (usuario + permisos administrativos)
3. Reorganizar directorios según estructura propuesta
4. Validar y reforzar seguridad en cada endpoint
5. Actualizar imports en archivos que consumen los endpoints

**Endpoints Actuales Conocidos**:
- `/api/auth/**` (Public)
- `/api/permissions/**` (Admin)
- `/api/roles/**` (Admin)
- `/api/menu/**` (Admin + Public)
- `/api/users/**` (Admin)
- `/api/audit/**` (Admin)
- `/api/user/profile/**` (Customer)
- `/api/user/change-password/**` (Customer)
- `/api/health/**` (Public)

#### Fase 5 - Plantillas Mustache:
**Ruta**: `/templates/`
**Objetivo**: Auditar, organizar y documentar plantillas

**Tareas**:
1. Listar todas las plantillas en `/templates/`
2. Identificar el propósito de cada plantilla
3. Verificar variables disponibles y validación
4. Organizar por contexto (si aplica)
5. Documentar variables requeridas por plantilla

### Rama de Trabajo Sugerida
Para mañana, crear rama: `git checkout -b feature/api-organization`
Después de Fase 4, crear: `git checkout -b feature/templates-organization`

### Referencias Útiles
- Documento Plan (este archivo): `/docs/feature/REFACTOR_PUBLIC_ADMIN_SPLIT.md`
- Especificación de Pasos 5.2: Ver sección "Estrategia de Separación de API Routes"
- Último Commit de Módulos: `5c03ae6` - Separación completa de módulos Admin y Shared
- Rama Main (Actualizada): Verificar que incluya merge de core-auth

### Notas Técnicas
- Los servicios y utilidades ya están organizados en módulos
- Los imports están actualizados con path aliases `@/modules/`
- Build y Lint pasan sin errores
- No hay dependencias circulares conocidas en la arquitectura actual

### Próximos Pasos Después de Fase 5
1. Validación integral del sistema completo
2. Testing de flujos público → admin
3. Documentación de arquitectura final
4. Merge a main cuando esté listo