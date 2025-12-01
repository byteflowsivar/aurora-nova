# Plan de Refactorización: Separación de App Pública y Panel de Administración

**Proyecto:** Aurora Nova - Application Base
**Fecha**: 2025-11-30
**Estado**: 📝 Pendiente

---

## 1. Visión General

### Objetivo
Refactorizar la estructura de rutas y el sistema de menús para separar formalmente la lógica y el acceso en zonas distintas:
1.  **Zona Pública**: Accesible para cualquier visitante.
2.  **Zona de Usuario Autenticado**: Para usuarios logueados no-administradores (ej. "Mi Cuenta").
3.  **Panel de Administración**: Un área `/admin` estrictamente protegida para la gestión del sistema.

### Beneficios
- **Seguridad**: Se establece una barrera clara y robusta para el panel de administración.
- **Mantenibilidad**: El código y los menús de la lógica pública y administrativa viven separados, facilitando su desarrollo.
- **Organización**: El sistema de menús se vuelve más estructurado y escalable.

---

## 2. Estructura de Rutas y Menús Objetivo

### Rutas
La estructura final dentro de `src/app/` se organizará con [Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups).

```
src/app/
├── (auth)/                 # Páginas de autenticación
├── (public)/               # Páginas públicas
├── (customer)/             # Páginas para usuarios logueados no-admins
│   └── account/
│       └── settings/
├── (admin)/                # Grupo para el panel de administración
│   ├── layout.tsx          # Layout que valida ROL de administrador
│   └── admin/
│       ├── dashboard/
│       └── ...
└── layout.tsx
```

### Sistema de Menú
Se añadirá una clasificación de dos niveles a la tabla `MenuItem` para gestionar múltiples menús de forma centralizada:
-   **`context`**: El área general de la aplicación (`PANEL_ADMIN`, `PUBLICO`).
-   **`type`**: El menú específico dentro de ese contexto (`SIDEBAR`, `HEADER`).

---

## 3. Plan de Ejecución Detallado

### Paso 1: Preparación

1.  **Crear una nueva rama** para aislar los cambios:
    ```bash
    git checkout -b feature/refactor-public-admin-split
    ```

### Paso 2: Adaptar el Sistema de Menú Dinámico

Este paso implementa tu sugerencia para hacer el sistema de menús más robusto.

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

### Paso 3: Reestructurar el Panel de Administración

1.  **Crear directorios**: `mkdir -p application-base/src/app/\(admin\)/admin`
2.  **Mover páginas**: `mv application-base/src/app/\(protected\)/* application-base/src/app/\(admin\)/admin/` (Ajusta según tu shell).
3.  **Mover layout**: `mv application-base/src/app/\(protected\)/layout.tsx application-base/src/app/\(admin\)/layout.tsx`
4.  **Eliminar directorio antiguo**: `rm -rf application-base/src/app/\(protected\)`

### Paso 4: Fortalecer la Seguridad del Layout de Administración

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

### Paso 5: Crear Zonas Pública y de Cliente

1.  **Crear `src/app/(public)/page.tsx`** con el contenido de la futura landing page.
2.  **Crear `src/app/(customer)/account/settings/`** y mover la página de perfil allí.
3.  **Crear `src/app/(customer)/layout.tsx`** que solo verifique la sesión con `await auth()`.

### Paso 6: Actualizar Middleware y Página Principal

1.  **Modificar `application-base/src/proxy.ts`**: Actualizar las `publicRoutes` y los `protectedPrefixes` (`/admin`, `/account`).
2.  **Modificar `application-base/src/app/page.tsx`**: Hacer que redirija a `/admin/dashboard` si el usuario está autenticado, o que muestre la página pública si no lo está.

### Paso 7: Verificación y Pruebas

1.  Ejecuta `npm run dev`.
2.  **Verifica los flujos de acceso**:
    -   Acceso a `/admin/dashboard` sin login debe redirigir a `/auth/signin`.
    -   Login con un usuario sin rol de admin debe mostrar "Acceso Denegado" al intentar entrar a `/admin/*`.
    -   Login con un Super Administrador debe dar acceso completo a `/admin/*`.
    -   El menú en `/admin/dashboard` debe cargarse correctamente.
    -   Los enlaces del menú deben apuntar a las rutas correctas (ej. `/admin/users`).