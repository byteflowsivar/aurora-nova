# Plan de Implementación: Menú Dinámico Basado en Base de Datos

**Módulo**: Auth & Authz
**Versión**: Alpha
**Fecha**: 2025-11-04
**Estado**: 🟡 En Progreso

---

## 📋 Resumen Ejecutivo

Implementación de un sistema de menú dinámico gestionado desde la base de datos que reemplaza el menú estático hardcodeado en el código. Este cambio resuelve el problema de hidratación de la sesión en el cliente y permite una gestión más flexible y escalable del menú de navegación.

### Objetivos

1. ✅ Eliminar problema de hidratación de menú en primera carga
2. ✅ Permitir gestión del menú sin necesidad de deploy
3. ✅ Soportar menús jerárquicos de 2 niveles
4. ✅ Integrar control de acceso basado en permisos
5. ✅ Mantener rendimiento óptimo con caché

---

## 🏗️ Arquitectura del Menú

### Estructura Jerárquica

```
Nivel 1 (Root Items)
├── Item Directo (con href) → Navega a pantalla
└── Item Grupo (sin href) → Solo agrupa
    ├── Nivel 2: Item Directo (con href)
    ├── Nivel 2: Item Directo (con href)
    └── Nivel 2: Item Directo (con href)
```

### Reglas de Negocio

1. **Nivel 1**: Puede ser:
   - **Item Directo**: Tiene `href`, navega directamente a una pantalla
   - **Item Grupo**: NO tiene `href`, agrupa items del nivel 2

2. **Nivel 2**: Solo puede ser:
   - **Item Directo**: Siempre tiene `href`, hijo de un grupo del nivel 1

3. **Control de Acceso**:
   - Items sin `permissionId`: Visibles para todos los usuarios autenticados
   - Items con `permissionId`: Visibles solo si el usuario tiene ese permiso

4. **Ordenamiento**: Campo `order` determina la posición de visualización

---

## 📊 Modelo de Datos

### Tabla `menu_item`

```prisma
model MenuItem {
  id           String      @id @default(cuid())
  title        String      // Título mostrado en UI
  href         String?     // Ruta (null para grupos)
  icon         String?     // Nombre del ícono de lucide-react
  order        Int         // Orden de visualización
  isActive     Boolean     @default(true) // Activar/desactivar sin eliminar

  // Relación con Permission (opcional)
  permissionId String?
  permission   Permission? @relation(fields: [permissionId], references: [id], onDelete: SetNull)

  // Jerarquía (autorreferencia)
  parentId     String?
  parent       MenuItem?   @relation("MenuHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children     MenuItem[]  @relation("MenuHierarchy")

  // Auditoría
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  @@index([parentId])
  @@index([order])
  @@index([isActive])
  @@map("menu_item")
}
```

### Índices

- `parentId`: Para queries jerárquicas eficientes
- `order`: Para ordenamiento rápido
- `isActive`: Para filtrar items activos

---

## 🎯 Tareas de Implementación

### **Fase 1: Base de Datos y Modelos (✅ Completada)**

#### ✅ Tarea 1.1: Actualizar Schema de Prisma
- **Archivo**: `application-base/prisma/schema.prisma`
- **Descripción**: Agregar modelo `MenuItem` con relaciones
- **Dependencias**: Ninguna
- **Estimado**: 15 min

**Acciones**:
```prisma
// Agregar al schema existente
model MenuItem {
  // ... (ver modelo arriba)
}

// Actualizar model Permission para agregar relación
model Permission {
  // ... campos existentes
  menuItems MenuItem[] // Agregar esta línea
}
```

#### ✅ Tarea 1.2: Generar Cliente Prisma
- **Comando**: `npm run prisma:generate`
- **Descripción**: Regenerar cliente de Prisma con nuevo modelo
- **Dependencias**: Tarea 1.1
- **Estimado**: 2 min

#### ✅ Tarea 1.3: Crear y Ejecutar Migración
- **Comando**: `npm run prisma:migrate:dev -- --name add_menu_item_table`
- **Descripción**: Crear tabla `menu_item` en la base de datos
- **Dependencias**: Tarea 1.2
- **Estimado**: 5 min
- **Nota**: Como estamos en alpha, esto destruirá y recreará la BD

---

### **Fase 2: Seeds - Datos Iniciales (✅ Completada)**

#### ✅ Tarea 2.1: Crear Seeder de Menu Items
- **Archivo**: `application-base/prisma/seeds/menu-items.ts`
- **Descripción**: Crear seeder con menú inicial del sistema
- **Dependencias**: Tarea 1.3
- **Estimado**: 30 min

**Estructura del Menú Inicial**:

```typescript
// Nivel 1 - Items Directos
{
  id: "menu-dashboard",
  title: "Dashboard",
  href: "/dashboard",
  icon: "LayoutDashboard",
  order: 1,
  isActive: true,
  permissionId: null, // Accesible para todos
  parentId: null
}

// Nivel 1 - Grupo de Administración
{
  id: "menu-admin-group",
  title: "Administración",
  href: null, // Grupo sin ruta
  icon: "Settings",
  order: 2,
  isActive: true,
  permissionId: null, // El grupo es visible, pero sus hijos requieren permisos
  parentId: null
}

// Nivel 2 - Hijos de Administración
{
  id: "menu-users",
  title: "Usuarios",
  href: "/users",
  icon: "Users",
  order: 1,
  isActive: true,
  permissionId: "user:list", // Requiere permiso
  parentId: "menu-admin-group"
}

{
  id: "menu-roles",
  title: "Roles",
  href: "/roles",
  icon: "Shield",
  order: 2,
  isActive: true,
  permissionId: "role:list",
  parentId: "menu-admin-group"
}

{
  id: "menu-permissions",
  title: "Permisos",
  href: "/permissions",
  icon: "Key",
  order: 3,
  isActive: true,
  permissionId: "permission:list",
  parentId: "menu-admin-group"
}
```

#### ✅ Tarea 2.2: Integrar Seeder en Script Principal
- **Archivo**: `application-base/prisma/seed.ts`
- **Descripción**: Importar y ejecutar seeder de menu items
- **Dependencias**: Tarea 2.1
- **Estimado**: 10 min

```typescript
import { seedMenuItems } from './seeds/menu-items'

async function main() {
  // ... seeders existentes
  await seedMenuItems()
}
```

#### ✅ Tarea 2.3: Ejecutar Seeds Completos
- **Comando**: `npm run prisma:seed`
- **Descripción**: Poblar BD con datos iniciales incluyendo menú
- **Dependencias**: Tarea 2.2
- **Estimado**: 5 min

---

### **Fase 3: Backend - Queries y APIs (✅ Completada)**

#### ✅ Tarea 3.1: Crear Queries de Menú
- **Archivo**: `application-base/src/lib/prisma/menu-queries.ts`
- **Descripción**: Funciones para obtener menú filtrado por permisos
- **Dependencias**: Tarea 2.3
- **Estimado**: 45 min

**Funciones a implementar**:

```typescript
/**
 * Obtiene el menú completo filtrado por permisos del usuario
 * Retorna estructura jerárquica lista para renderizar
 */
export async function getMenuForUser(userId: string): Promise<MenuItem[]>

/**
 * Obtiene todos los items del menú (admin)
 * Para gestión en panel de administración
 */
export async function getAllMenuItems(): Promise<MenuItem[]>

/**
 * Crea un nuevo item de menú
 */
export async function createMenuItem(data: CreateMenuItemInput): Promise<MenuItem>

/**
 * Actualiza un item de menú
 */
export async function updateMenuItem(id: string, data: UpdateMenuItemInput): Promise<MenuItem>

/**
 * Elimina un item de menú
 */
export async function deleteMenuItem(id: string): Promise<void>

/**
 * Reordena items del menú
 */
export async function reorderMenuItems(items: { id: string; order: number }[]): Promise<void>
```

**Lógica de Filtrado**:
1. Obtener permisos del usuario
2. Cargar items de nivel 1 activos
3. Para cada item nivel 1:
   - Si tiene `permissionId`, verificar que el usuario lo tenga
   - Si no tiene `permissionId`, incluir siempre
   - Si es grupo, cargar hijos y aplicar misma lógica
4. Retornar solo items con acceso, manteniendo jerarquía

#### ✅ Tarea 3.2: Crear API Route para Menú
- **Archivo**: `application-base/src/app/api/menu/route.ts`
- **Descripción**: Endpoint GET que retorna menú del usuario actual
- **Dependencias**: Tarea 3.1
- **Estimado**: 20 min

```typescript
// GET /api/menu
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const menu = await getMenuForUser(session.user.id)
  return NextResponse.json(menu)
}
```

#### ✅ Tarea 3.3: Crear API Routes para Admin de Menú
- **Archivo**: `application-base/src/app/api/admin/menu/route.ts`
- **Descripción**: CRUD completo para gestión de menú (admin)
- **Dependencias**: Tarea 3.1
- **Estimado**: 45 min

Endpoints:
- `GET /api/admin/menu` - Listar todos los items
- `POST /api/admin/menu` - Crear item
- `PATCH /api/admin/menu/[id]` - Actualizar item
- `DELETE /api/admin/menu/[id]` - Eliminar item
- `POST /api/admin/menu/reorder` - Reordenar items

---

### **Fase 4: Frontend - Componentes y UI (✅ Completada)**

#### ✅ Tarea 4.1: Crear Tipos TypeScript para Menú
- **Archivo**: `application-base/src/lib/types/menu.ts`
- **Descripción**: Definir tipos e interfaces para el menú
- **Dependencias**: Tarea 3.1
- **Estimado**: 15 min

```typescript
export interface MenuItem {
  id: string
  title: string
  href: string | null
  icon: string | null
  order: number
  isActive: boolean
  permissionId: string | null
  parentId: string | null
  children?: MenuItem[]
}

export interface MenuGroup extends MenuItem {
  href: null
  children: MenuItem[]
}

export interface MenuLink extends MenuItem {
  href: string
  children?: never
}
```

#### ⚪ Tarea 4.2: Crear Hook useMenu (Omitida - se usó enfoque SSR)
- **Archivo**: `application-base/src/hooks/use-menu.ts`
- **Descripción**: Hook cliente para obtener menú desde API
- **Dependencias**: Tarea 3.2, 4.1
- **Estimado**: 25 min

```typescript
export function useMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch('/api/menu')
        const data = await response.json()
        setMenu(data)
      } catch (err) {
        setError('Error al cargar el menú')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMenu()
  }, [])

  return { menu, isLoading, error }
}
```

#### ✅ Tarea 4.3: Crear Server Function para Menú
- **Archivo**: `application-base/src/lib/menu/get-menu-server.ts`
- **Descripción**: Función servidor para obtener menú (SSR)
- **Dependencias**: Tarea 3.1, 4.1
- **Estimado**: 15 min

```typescript
export async function getMenuServer(): Promise<MenuItem[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await getMenuForUser(session.user.id)
}
```

**Nota**: Esta función se usa en Server Components para pre-renderizar el menú sin delay.

#### ✅ Tarea 4.4: Refactorizar AppSidebar para Usar Menú Dinámico
- **Archivo**: `application-base/src/components/layout/app-sidebar.tsx`
- **Descripción**: Reemplazar array estático por menú desde servidor
- **Dependencias**: Tarea 4.3
- **Estimado**: 45 min

**Cambios**:
1. Eliminar `mainNavItems` hardcodeado
2. Recibir `menuItems` como prop desde el layout
3. Renderizar menú jerárquico:
   - Items directos como `<SidebarMenuItem>`
   - Grupos como `<SidebarGroup>` con hijos en `<SidebarMenuSub>`
4. Mapear íconos de string a componentes de lucide-react

```typescript
// Antes (hardcoded)
const mainNavItems = [...]

// Después (dinámico)
interface AppSidebarProps {
  menuItems: MenuItem[]
}

export function AppSidebar({ menuItems }: AppSidebarProps) {
  // Renderizar items recursivamente
}
```

#### ✅ Tarea 4.5: Actualizar Protected Layout
- **Archivo**: `application-base/src/app/(protected)/layout.tsx`
- **Descripción**: Obtener menú del servidor y pasarlo al sidebar
- **Dependencias**: Tarea 4.4
- **Estimado**: 15 min

```typescript
export default async function ProtectedLayout({ children }) {
  const session = await auth()
  if (!session?.user) redirect("/auth/signin")

  // Obtener menú del servidor
  const menuItems = await getMenuServer()

  return (
    <SidebarProvider>
      <AppSidebar menuItems={menuItems} />
      {/* ... resto del layout */}
    </SidebarProvider>
  )
}
```

#### ✅ Tarea 4.6: Crear Mapeo de Íconos
- **Archivo**: `application-base/src/lib/utils/icon-mapper.ts`
- **Descripción**: Mapear strings a componentes de lucide-react
- **Dependencias**: Ninguna
- **Estimado**: 20 min

```typescript
import * as LucideIcons from 'lucide-react'

export function getIcon(iconName: string | null) {
  if (!iconName) return null

  // Mapeo seguro con type checking
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons]

  if (!IconComponent) {
    console.warn(`Ícono no encontrado: ${iconName}`)
    return LucideIcons.Circle // Ícono por defecto
  }

  return IconComponent
}
```

---

### **Fase 5: Optimizaciones (✅ En Progreso)**

#### ✅ Tarea 5.1: Implementar Caché de Menú
- **Archivo**: `application-base/src/lib/menu/menu-cache.ts`
- **Descripción**: Sistema de caché en memoria para el menú
- **Dependencias**: Tarea 3.1
- **Estimado**: 30 min

**Estrategia**:
- Caché por `userId` con TTL de 5 minutos
- Invalidar caché cuando se modifican items del menú
- Usar `Map` en memoria (considerar Redis en producción)

```typescript
const menuCache = new Map<string, { menu: MenuItem[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export async function getCachedMenu(userId: string): Promise<MenuItem[]> {
  const cached = menuCache.get(userId)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.menu
  }

  const menu = await getMenuForUser(userId)
  menuCache.set(userId, { menu, timestamp: Date.now() })

  return menu
}

export function invalidateMenuCache() {
  menuCache.clear()
}
```

#### Tarea 5.2: Agregar React Query para Menú Cliente
- **Archivo**: `application-base/src/hooks/use-menu.ts`
- **Descripción**: Usar React Query para caché y refetch automático
- **Dependencias**: Tarea 3.2, 4.1
- **Estimado**: 25 min
- **Nota**: Opcional, mejora UX en navegación

---

### **Fase 6: Testing y Documentación**

#### Tarea 6.1: Tests Unitarios - Queries
- **Archivo**: `application-base/src/lib/prisma/menu-queries.test.ts`
- **Descripción**: Tests para funciones de query del menú
- **Dependencias**: Tarea 3.1
- **Estimado**: 45 min

**Casos de prueba**:
- Usuario con todos los permisos ve todo el menú
- Usuario sin permisos ve solo items públicos
- Grupos vacíos se filtran correctamente
- Jerarquía se mantiene correctamente

#### Tarea 6.2: Tests de Integración - API
- **Archivo**: `application-base/src/app/api/menu/route.test.ts`
- **Descripción**: Tests para endpoints del menú
- **Dependencias**: Tarea 3.2
- **Estimado**: 30 min

#### Tarea 6.3: Actualizar Documentación
- **Archivo**: `docs/01_modules/01_auth_and_authz/03_features/05_dynamic_menu.md`
- **Descripción**: Documentar sistema de menú dinámico
- **Dependencias**: Todas las anteriores
- **Estimado**: 45 min

---

## 🔄 Proceso de Migración (Alpha)

### Opción A: Migración Completa (Recomendada para Alpha)

```bash
# 1. Backup de datos importantes (si los hay)
npm run prisma:export-data

# 2. Drop y recrear base de datos
npm run prisma:migrate:reset

# 3. Aplicar todas las migraciones
npm run prisma:migrate:deploy

# 4. Ejecutar seeds completos
npm run prisma:seed
```

### Opción B: Migración Incremental (Si hay datos en producción)

```bash
# 1. Crear migración sin reset
npm run prisma:migrate:dev -- --name add_menu_item_table

# 2. Ejecutar solo seeder de menú
npm run prisma:seed:menu
```

---

## 📊 Estimaciones

### Tiempo Total Estimado

| Fase | Tareas | Tiempo Estimado |
|------|--------|-----------------|
| Fase 1: Base de Datos | 3 tareas | 22 min |
| Fase 2: Seeds | 3 tareas | 45 min |
| Fase 3: Backend | 3 tareas | 110 min |
| Fase 4: Frontend | 6 tareas | 155 min |
| Fase 5: Optimizaciones | 2 tareas | 55 min |
| Fase 6: Testing | 3 tareas | 120 min |
| **TOTAL** | **20 tareas** | **~8.5 horas** |

### Distribución Sugerida

- **Sesión 1** (2-3 horas): Fases 1, 2 y 3 (Base de datos y Backend)
- **Sesión 2** (3-4 horas): Fase 4 (Frontend)
- **Sesión 3** (2-3 horas): Fases 5 y 6 (Optimizaciones y Testing)

---

## ✅ Criterios de Aceptación

### Funcionales

1. ✅ El menú se carga desde la base de datos correctamente
2. ✅ Items sin permiso son visibles para todos los usuarios
3. ✅ Items con permiso solo son visibles para usuarios autorizados
4. ✅ La jerarquía de 2 niveles se respeta
5. ✅ Grupos sin hijos con permisos se ocultan automáticamente
6. ✅ El orden de los items se respeta según campo `order`
7. ✅ Items desactivados (`isActive: false`) no se muestran

### Técnicos

1. ✅ No hay errores de hidratación en el cliente
2. ✅ El menú se renderiza en el primer load sin delay
3. ✅ Los íconos se mapean correctamente desde strings
4. ✅ La caché funciona y reduce queries a BD
5. ✅ Migraciones ejecutan sin errores
6. ✅ Seeds poblan correctamente la BD

### Rendimiento

1. ✅ Query del menú ejecuta en < 50ms
2. ✅ Renderizado del sidebar en < 100ms
3. ✅ Cache hit rate > 90% en uso normal

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Pérdida de datos en reset de BD | Media | Alto | Crear script de backup antes de migración |
| Problemas con íconos no encontrados | Alta | Bajo | Implementar ícono por defecto + logs |
| Performance en menús grandes | Baja | Medio | Implementar caché + limit de items |
| Complejidad en UI de 2 niveles | Media | Medio | Usar componentes shadcn/ui probados |

---

## 📝 Notas Adicionales

### Extensiones Futuras (Post-Alpha)

1. **Nivel 3 de jerarquía**: Si se requiere más profundidad
2. **Menú personalizable por usuario**: Permitir que usuarios oculten/reordenen items
3. **Badges y notificaciones**: Mostrar contadores en items del menú
4. **Menú por rol**: Configuraciones diferentes de menú según rol
5. **Analytics**: Trackear qué items del menú se usan más
6. **Drag & Drop Admin**: Interfaz visual para reordenar items

### Dependencias Externas

- `lucide-react`: Para íconos (ya instalado)
- `@tanstack/react-query`: Para caché cliente (opcional)

### Scripts Necesarios

Agregar a `package.json`:

```json
{
  "scripts": {
    "prisma:export-data": "tsx prisma/scripts/export-data.ts",
    "prisma:seed:menu": "tsx prisma/seeds/menu-items.ts"
  }
}
```

---

## 🎯 Próximos Pasos

Una vez aprobado este plan:

1. ✅ Confirmar que el plan es correcto
2. ✅ Iniciar implementación por fases
3. ✅ Hacer commits incrementales por tarea
4. ✅ Testing continuo durante implementación
5. ✅ Documentar cualquier desviación del plan

---

**Estado**: 🟡 En Progreso
**Última Actualización**: 2025-11-04
**Autor**: Claude Code + Rex2002xp
