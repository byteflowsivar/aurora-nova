/**
 * Módulo de Tipos para Menú Administrativo Jerárquico - Aurora Nova
 *
 * Define tipos e interfaces para un sistema de menú jerárquico con soporte
 * para grupos (carpetas) y enlaces, protección basada en permisos, y visibilidad.
 *
 * **Características**:
 * - Estructura jerárquica (padres/hijos)
 * - Soporte para grupos de menú (sin href) y enlaces (con href)
 * - Control de permisos basado en permissionId
 * - Visibilidad controlable (isActive)
 * - Orden personalizable
 * - Iconos configurable para cada elemento
 *
 * **Componentes Principales**:
 * 1. **MenuItem** - Interfaz base para cualquier elemento del menú
 * 2. **MenuGroup** - Grupo/carpeta de menú (sin href, con children)
 * 3. **MenuLink** - Enlace del menú (con href, sin children)
 *
 * **Ejemplo de Estructura Jerárquica**:
 * ```typescript
 * const menu: MenuItem[] = [
 *   {
 *     id: 'admin',
 *     title: 'Administración',
 *     href: null,
 *     icon: 'settings',
 *     order: 1,
 *     isActive: true,
 *     permissionId: null,
 *     parentId: null,
 *     children: [
 *       {
 *         id: 'users',
 *         title: 'Usuarios',
 *         href: '/admin/users',
 *         icon: 'users',
 *         order: 1,
 *         isActive: true,
 *         permissionId: 'user:list',
 *         parentId: 'admin',
 *       },
 *       {
 *         id: 'roles',
 *         title: 'Roles',
 *         href: '/admin/roles',
 *         icon: 'shield',
 *         order: 2,
 *         isActive: true,
 *         permissionId: 'role:list',
 *         parentId: 'admin',
 *       },
 *     ]
 *   },
 *   {
 *     id: 'dashboard',
 *     title: 'Dashboard',
 *     href: '/dashboard',
 *     icon: 'home',
 *     order: 0,
 *     isActive: true,
 *     permissionId: null,
 *     parentId: null,
 *   }
 * ]
 * ```
 *
 * **Patrón de Filtrado por Permisos**:
 * ```typescript
 * function filterMenuByPermissions(menu: MenuItem[], userPerms: string[]): MenuItem[] {
 *   return menu
 *     .filter(item => !item.permissionId || userPerms.includes(item.permissionId))
 *     .map(item => ({
 *       ...item,
 *       children: item.children
 *         ? filterMenuByPermissions(item.children, userPerms)
 *         : undefined
 *     }))
 *     .filter(item => item.isActive && (!item.children || item.children.length > 0))
 * }
 * ```
 *
 * @module admin/types/menu
 * @see {@link ../../shared/types/action-response.ts} para respuestas de acciones de menú
 * @see {@link ../services/menu-queries.ts} para queries de base de datos de menú
 */

/**
 * Elemento base del menú administrativo
 *
 * Interfaz abstracta que define la estructura común para todos los elementos del menú.
 * Puede ser un grupo/carpeta (MenuGroup) o un enlace (MenuLink).
 * Soporta estructura jerárquica con parentId y children.
 *
 * **Campos**:
 * - `id`: Identificador único del elemento
 * - `title`: Título legible mostrado en la UI
 * - `href`: Ruta de navegación (null para grupos, string para enlaces)
 * - `icon`: Nombre del icono (ej: "users", "settings", "home")
 * - `order`: Número para ordenar elementos (menor = más arriba)
 * - `isActive`: Control de visibilidad/habilitación
 * - `permissionId`: Identificador de permiso requerido (null = sin restricción)
 * - `parentId`: ID del elemento padre (null = raíz)
 * - `children`: Array de elementos hijos (opcional)
 *
 * **Estructura de href**:
 * - `null` para grupos/carpetas (MenuGroup)
 * - String con ruta (ej: "/admin/users") para enlaces (MenuLink)
 *
 * **Jerarquía**:
 * - Elementos sin parentId son raíz
 * - Elementos con parentId son hijos de ese elemento
 * - Solo MenuGroup puede tener children
 *
 * **Control de Acceso**:
 * - `permissionId`: Nombre del permiso requerido (ej: "user:list", "role:manage")
 * - Si es null, el elemento es accesible para todos
 * - Si el usuario no tiene el permiso, el elemento debe ocultarse
 *
 * **Ejemplo**:
 * ```typescript
 * const menuItem: MenuItem = {
 *   id: 'users',
 *   title: 'Gestión de Usuarios',
 *   href: '/admin/users',
 *   icon: 'users',
 *   order: 1,
 *   isActive: true,
 *   permissionId: 'user:list',
 *   parentId: 'admin',
 *   // No tiene children porque es un enlace (MenuLink)
 * }
 *
 * const adminGroup: MenuItem = {
 *   id: 'admin',
 *   title: 'Administración',
 *   href: null,  // Es grupo, no tiene enlace
 *   icon: 'settings',
 *   order: 1,
 *   isActive: true,
 *   permissionId: null,  // Grupo visible para todos
 *   parentId: null,  // Es raíz
 *   children: [ menuItem ] // Contiene elementos hijos
 * }
 * ```
 *
 * **Patrón Típico de Renderización**:
 * ```typescript
 * function renderMenu(items: MenuItem[], userPerms: string[]): ReactNode {
 *   return items
 *     .filter(item => item.isActive && (!item.permissionId || userPerms.includes(item.permissionId)))
 *     .sort((a, b) => a.order - b.order)
 *     .map(item =>
 *       item.children ? (
 *         <MenuGroup key={item.id} item={item}>
 *           {renderMenu(item.children, userPerms)}
 *         </MenuGroup>
 *       ) : (
 *         <MenuLink key={item.id} href={item.href} icon={item.icon}>
 *           {item.title}
 *         </MenuLink>
 *       )
 *     )
 * }
 * ```
 *
 * @interface
 * @example
 * ```typescript
 * // Obtener menú de la BD
 * const menuItems = await db.menu.findMany({
 *   where: { isActive: true },
 *   orderBy: [{ order: 'asc' }]
 * })
 *
 * // Filtrar por permiso
 * const userMenu = menuItems.filter(item => !item.permissionId || userPerms.includes(item.permissionId))
 * ```
 *
 * @see {@link MenuGroup} para especificación de grupos
 * @see {@link MenuLink} para especificación de enlaces
 */
export interface MenuItem {
  /** Identificador único del elemento */
  id: string
  /** Título legible mostrado en la UI */
  title: string
  /** Ruta de navegación (null para grupos, string para enlaces) */
  href: string | null
  /** Nombre del icono (ej: "users", "settings", "shield") */
  icon: string | null
  /** Número de orden para ordenar elementos (menor = más arriba) */
  order: number
  /** true = visible/habilitado, false = oculto/deshabilitado */
  isActive: boolean
  /** ID del permiso requerido para acceder (null = sin restricción) */
  permissionId: string | null
  /** ID del elemento padre (null = elemento raíz) */
  parentId: string | null
  /** Array de elementos hijos (solo para grupos) */
  children?: MenuItem[]
}

/**
 * Grupo/Carpeta de menú jerárquico
 *
 * Especialización de MenuItem que representa un grupo o carpeta de menú.
 * Agrupa múltiples elementos relacionados (MenuLink o MenuGroup anidados).
 * No tiene una ruta propia, pero agrupa enlaces relacionados.
 *
 * **Diferencias con MenuItem base**:
 * - `href` es **siempre null** (no tiene ruta propia)
 * - `children` es **requerido** (debe tener elementos hijos)
 *
 * **Casos de Uso**:
 * - Carpeta "Administración" que contiene usuarios, roles, permisos
 * - Carpeta "Configuración" que contiene ajustes varios
 * - Cualquier agrupación lógica de elementos relacionados
 *
 * **Ejemplo**:
 * ```typescript
 * const adminGroup: MenuGroup = {
 *   id: 'admin',
 *   title: 'Administración',
 *   href: null,  // Tipo asegura que sea null
 *   icon: 'settings',
 *   order: 1,
 *   isActive: true,
 *   permissionId: null,
 *   parentId: null,
 *   children: [
 *     {
 *       id: 'users',
 *       title: 'Usuarios',
 *       href: '/admin/users',
 *       icon: 'users',
 *       order: 1,
 *       isActive: true,
 *       permissionId: 'user:list',
 *       parentId: 'admin'
 *     },
 *     {
 *       id: 'roles',
 *       title: 'Roles',
 *       href: '/admin/roles',
 *       icon: 'shield',
 *       order: 2,
 *       isActive: true,
 *       permissionId: 'role:list',
 *       parentId: 'admin'
 *     }
 *   ]
 * }
 * ```
 *
 * **Patrón de Type Guard**:
 * ```typescript
 * function isMenuGroup(item: MenuItem): item is MenuGroup {
 *   return item.href === null && Array.isArray(item.children)
 * }
 *
 * // Uso
 * if (isMenuGroup(item)) {
 *   // TypeScript sabe que item.children existe
 *   renderChildren(item.children)
 * }
 * ```
 *
 * **Visibilidad de Grupo**:
 * Un grupo debe ocultarse si:
 * 1. isActive es false
 * 2. Ninguno de sus hijos son accesibles (permiso requerido y usuario no tiene)
 * 3. Ninguno de sus hijos están activos (isActive = false)
 *
 * @interface
 * @extends MenuItem
 * @example
 * ```typescript
 * // Verificar si es grupo
 * const isGroup = 'children' in item && item.href === null
 *
 * // Renderizar grupo
 * if (isGroup) {
 *   return <Collapsible title={item.title} icon={item.icon}>
 *     {renderChildren(item.children)}
 *   </Collapsible>
 * }
 * ```
 *
 * @see {@link MenuItem} interfaz base
 * @see {@link MenuLink} para enlaces específicos
 */
export interface MenuGroup extends MenuItem {
  /** Los grupos NO tienen href (siempre null) */
  href: null
  /** Los grupos siempre tienen hijos */
  children: MenuItem[]
}

/**
 * Enlace de menú directo (sin children)
 *
 * Especialización de MenuItem que representa un enlace directo a una página/ruta.
 * No agrupa elementos, sino que navega directamente a una URL.
 * Típicamente renderizado como un <a> o <Link> en React.
 *
 * **Diferencias con MenuItem base**:
 * - `href` es **siempre string** (tiene ruta propia)
 * - `children` es **nunca definido** (no tiene elementos hijos)
 *
 * **Casos de Uso**:
 * - Enlace a lista de usuarios: "/admin/users"
 * - Enlace a dashboard: "/dashboard"
 * - Enlace a configuración global: "/admin/settings"
 * - Enlace externo: "https://docs.example.com"
 *
 * **Ejemplo**:
 * ```typescript
 * const usersLink: MenuLink = {
 *   id: 'users',
 *   title: 'Gestión de Usuarios',
 *   href: '/admin/users',  // Tipo asegura que sea string
 *   icon: 'users',
 *   order: 1,
 *   isActive: true,
 *   permissionId: 'user:list',
 *   parentId: 'admin'
 *   // Nunca tiene children
 * }
 *
 * const dashboardLink: MenuLink = {
 *   id: 'dashboard',
 *   title: 'Dashboard',
 *   href: '/dashboard',
 *   icon: 'home',
 *   order: 0,
 *   isActive: true,
 *   permissionId: null,  // Accesible para todos
 *   parentId: null  // Es elemento raíz
 * }
 * ```
 *
 * **Patrón de Type Guard**:
 * ```typescript
 * function isMenuLink(item: MenuItem): item is MenuLink {
 *   return item.href !== null && !Array.isArray(item.children)
 * }
 *
 * // Uso
 * if (isMenuLink(item)) {
 *   // TypeScript sabe que item.href es string
 *   return <Link href={item.href}>{item.title}</Link>
 * }
 * ```
 *
 * **Validación de href**:
 * - Para rutas internas: "/admin/users", "/dashboard"
 * - Para rutas externas: "https://...", "mailto:...", "tel:..."
 * - No debe ser string vacío
 * - En BD, validar que href sea ruta válida o URL externa
 *
 * **Renderización Típica**:
 * ```typescript
 * function renderMenuLink(link: MenuLink) {
 *   return (
 *     <Link href={link.href} className="menu-link">
 *       {link.icon && <Icon name={link.icon} />}
 *       <span>{link.title}</span>
 *     </Link>
 *   )
 * }
 * ```
 *
 * @interface
 * @extends MenuItem
 * @example
 * ```typescript
 * // Verificar si es enlace
 * const isLink = typeof item.href === 'string'
 *
 * // Acceder a href de forma type-safe
 * if (isMenuLink(item)) {
 *   window.location.href = item.href
 * }
 * ```
 *
 * @see {@link MenuItem} interfaz base
 * @see {@link MenuGroup} para grupos de menú
 */
export interface MenuLink extends MenuItem {
  /** Los enlaces siempre tienen href (nunca null) */
  href: string
  /** Los enlaces nunca tienen children */
  children?: never
}
