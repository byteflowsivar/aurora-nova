# Aurora Nova

Este es un proyecto [Next.js](https://nextjs.org) para Aurora Nova, un sistema de gestión de usuarios con control de acceso basado en roles (RBAC).

## Acerca de este proyecto

Aurora Nova es una aplicación web moderna construida con Next.js, TypeScript y PostgreSQL. Proporciona un sistema seguro y flexible para la gestión de usuarios, roles y permisos.

### Características

*   **Gestión de Usuarios**: Crea, lee, actualiza y elimina usuarios.
*   **Control de Acceso Basado en Roles (RBAC)**: Define roles y asigna permisos a los mismos.
*   **Menú Dinámico**: Sistema de navegación configurable desde base de datos con control de permisos.
*   **Autenticación Segura**: Utiliza `next-auth` para una autenticación segura.
*   **Interfaz de Usuario Moderna**: Construida con `shadcn/ui` para una interfaz de usuario limpia y responsiva.

## Configuración de Menús Dinámicos

Aurora Nova utiliza un sistema de menú dinámico basado en base de datos que permite configurar la navegación sin modificar el código. Los menús se filtran automáticamente según los permisos del usuario.

### Estructura del Menú

El sistema soporta menús jerárquicos de 2 niveles:

```
Nivel 1 (Root Items)
├── Item Directo (con href) → Navega a una pantalla
└── Item Grupo (sin href) → Solo agrupa items
    ├── Nivel 2: Item Directo (con href)
    ├── Nivel 2: Item Directo (con href)
    └── Nivel 2: Item Directo (con href)
```

### Modelo de Datos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | Identificador único (CUID) |
| `title` | String | Título mostrado en el UI |
| `href` | String? | Ruta de navegación (null para grupos) |
| `icon` | String? | Nombre del ícono de lucide-react |
| `order` | Int | Orden de visualización |
| `isActive` | Boolean | Activar/desactivar sin eliminar |
| `permissionId` | String? | Permiso requerido (null = visible para todos) |
| `parentId` | String? | ID del item padre (null = nivel 1) |

### Cómo Agregar Nuevos Items al Menú

Cuando agregues una nueva funcionalidad al sistema, necesitarás agregar el item correspondiente al menú. Tienes tres opciones:

#### Opción 1: Prisma Studio (Recomendado para desarrollo)

```bash
npx prisma studio
```

1. Abre la tabla `MenuItem`
2. Click en "Add record"
3. Completa los campos:
   - `id`: Un identificador único (ej: `menu-reports`)
   - `title`: "Reportes"
   - `href`: "/reports"
   - `icon`: "BarChart3" (nombre del ícono de [lucide.dev](https://lucide.dev))
   - `order`: 5 (define la posición)
   - `isActive`: true
   - `permissionId`: "report:list" (si requiere permiso, o null)
   - `parentId`: null (nivel 1) o ID del padre (nivel 2)
4. Click en "Save 1 change"

#### Opción 2: Modificar Seeds (Recomendado para versionamiento)

Edita `prisma/seeds/menu-items.ts`:

```typescript
const menuItems = [
  // ... items existentes

  // Nuevo item de nivel 1
  {
    id: 'menu-reports',
    title: 'Reportes',
    href: '/reports',
    icon: 'BarChart3',
    order: 5,
    isActive: true,
    permissionId: 'report:list', // Requiere permiso
    parentId: null, // Nivel 1
  },

  // O agregar a un grupo existente (nivel 2)
  {
    id: 'menu-analytics',
    title: 'Analytics',
    href: '/analytics',
    icon: 'TrendingUp',
    order: 4,
    isActive: true,
    permissionId: 'analytics:view',
    parentId: 'menu-admin-group', // Hijo del grupo Administración
  },
];
```

Luego ejecuta:
```bash
npm run db:reset  # En desarrollo
# o
npm run db:seed   # Si solo quieres ejecutar seeds
```

#### Opción 3: SQL Directo (Producción)

```sql
-- Agregar item de nivel 1
INSERT INTO menu_item (id, title, href, icon, "order", is_active, permission_id, parent_id, created_at, updated_at)
VALUES (
  'menu-reports',
  'Reportes',
  '/reports',
  'BarChart3',
  5,
  true,
  'report:list',
  NULL,
  NOW(),
  NOW()
);

-- Agregar item de nivel 2 (hijo de un grupo)
INSERT INTO menu_item (id, title, href, icon, "order", is_active, permission_id, parent_id, created_at, updated_at)
VALUES (
  'menu-analytics',
  'Analytics',
  '/analytics',
  'TrendingUp',
  4,
  true,
  'analytics:view',
  'menu-admin-group',
  NOW(),
  NOW()
);
```

### Control de Permisos

#### Items sin permiso (públicos)
```typescript
{
  permissionId: null, // Visible para todos los usuarios autenticados
}
```

#### Items con permiso (restringidos)
```typescript
{
  permissionId: 'report:list', // Solo visible si el usuario tiene este permiso
}
```

**Importante:** No olvides crear el permiso correspondiente en la tabla `permission` si aún no existe:

```sql
INSERT INTO permission (id, module, description, created_at, updated_at)
VALUES ('report:list', 'Reports', 'Ver listado de reportes', NOW(), NOW());
```

O en los seeds de permisos (`scripts/seed.ts`):

```typescript
const permissions = [
  // ... permisos existentes
  { id: 'report:list', module: 'Reports', description: 'Ver listado de reportes' },
];
```

### Íconos Disponibles

El sistema usa íconos de [Lucide React](https://lucide.dev). Algunos íconos comunes:

- `LayoutDashboard` - Dashboard
- `Users` - Usuarios
- `Shield` - Roles/Seguridad
- `Key` - Permisos
- `Settings` - Configuración
- `BarChart3` - Reportes/Gráficas
- `FileText` - Documentos
- `Calendar` - Calendario
- `Mail` - Correos

Consulta la lista completa en [lucide.dev/icons](https://lucide.dev/icons).

### Ejemplo Completo: Agregar Módulo de Reportes

```typescript
// 1. Agregar permisos en scripts/seed.ts
const permissions = [
  // ... permisos existentes
  { id: 'report:list', module: 'Reports', description: 'Ver reportes' },
  { id: 'report:export', module: 'Reports', description: 'Exportar reportes' },
];

// 2. Agregar items de menú en prisma/seeds/menu-items.ts
const menuItems = [
  // ... items existentes

  // Grupo de Reportes
  {
    id: 'menu-reports-group',
    title: 'Reportes',
    href: null, // Es un grupo, no navega
    icon: 'BarChart3',
    order: 3,
    isActive: true,
    permissionId: null, // El grupo es visible, los hijos requieren permisos
    parentId: null,
  },

  // Reporte de Ventas
  {
    id: 'menu-sales-report',
    title: 'Ventas',
    href: '/reports/sales',
    icon: 'TrendingUp',
    order: 1,
    isActive: true,
    permissionId: 'report:list',
    parentId: 'menu-reports-group',
  },

  // Reporte de Usuarios
  {
    id: 'menu-users-report',
    title: 'Usuarios',
    href: '/reports/users',
    icon: 'Users',
    order: 2,
    isActive: true,
    permissionId: 'report:list',
    parentId: 'menu-reports-group',
  },
];

// 3. Ejecutar seeds
// npm run db:reset
```

### API Endpoints (Avanzado)

Si necesitas gestionar menús programáticamente:

```typescript
// Obtener menú del usuario actual
GET /api/menu

// Administración (requiere permiso menu:manage)
GET    /api/admin/menu           // Listar todos
POST   /api/admin/menu           // Crear item
PATCH  /api/admin/menu/[id]      // Actualizar
DELETE /api/admin/menu/[id]      // Eliminar
POST   /api/admin/menu/reorder   // Reordenar
```

### Troubleshooting

**Problema:** El menú no se actualiza después de agregar un item
- **Solución:** Cierra sesión y vuelve a iniciar sesión (o reinicia el servidor dev)

**Problema:** El item no aparece en el menú
- **Verificar:** Que el usuario tenga el permiso requerido
- **Verificar:** Que `isActive` sea `true`
- **Verificar:** Que el `parentId` apunte a un item existente

**Problema:** El ícono no se muestra
- **Solución:** Verifica que el nombre del ícono esté correcto en [lucide.dev](https://lucide.dev)
- **Ejemplo:** Usa `BarChart3` en lugar de `BarChart` o `bar-chart-3`

## Primeros pasos

### Prerrequisitos

*   [Node.js](https://nodejs.org) (v20.x o superior)
*   [npm](https://www.npmjs.com) (v9.x o superior)
*   [Docker](https://www.docker.com) y [Docker Compose](https://docs.docker.com/compose/)

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd aurora-nova/app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar la base de datos

Este proyecto usa Docker para ejecutar una base de datos PostgreSQL. Inicia el contenedor de la base de datos con:

```bash
docker-compose up -d
```

### 4. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local` y completa las variables de entorno requeridas.

```bash
cp .env.example .env.local
```

### 5. Ejecutar migraciones y seed de la base de datos

```bash
npm run db:deploy
npm run db:seed
```

### 6. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

## Construyendo y Ejecutando con Docker

Este proyecto incluye un `Dockerfile` para construir y ejecutar la aplicación en un contenedor.

### Construir la imagen Docker

Para construir la imagen Docker, ejecuta el siguiente comando en el directorio `app`:

Si necesitas especificar argumentos de construcción, usa `docker buildx build`:
```bash
docker buildx build \
--build-arg NEXTAUTH_URL="http://app:3000" \
--build-arg AUTH_TRUST_HOST=true \
--build-arg AUTH_URL="http://app:3000" \
--build-arg APP_URL="http://app:3000" \
-t byteflowsivar/aurora-nova:0.01 .
```

Alternativamente, para una construcción estándar:
```bash
docker build -t aurora-nova .
```

### Ejecutar el contenedor Docker

Una vez que la imagen ha sido construida, puedes ejecutarla en un contenedor:

```bash
docker run -p 3000:3000 aurora-nova
```

Esto iniciará la aplicación en `http://localhost:3000`.

**Nota:** Para que la aplicación se conecte a la base de datos, necesitas proporcionar las variables de entorno necesarias al contenedor. Puedes hacer esto usando la bandera `-e` en el comando `docker run`, o usando un `--env-file`.

Por ejemplo:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database_name>" \
  -e NEXTAUTH_SECRET="your_super_secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  aurora-nova
```

## Aprende más

Para aprender más sobre Next.js, echa un vistazo a los siguientes recursos:

- [Documentación de Next.js](https://nextjs.org/docs) - aprende sobre las características y la API de Next.js.
- [Aprende Next.js](https://nextjs.org/learn) - un tutorial interactivo de Next.js.

Puedes consultar [el repositorio de Next.js en GitHub](https://github.com/vercel/next.js) - ¡tus comentarios y contribuciones son bienvenidos!

## Despliegue en Vercel

La forma más fácil de desplegar tu aplicación Next.js es usar la [Plataforma Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) de los creadores de Next.js.

Consulta nuestra [documentación de despliegue de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles.