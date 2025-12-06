/**
 * Módulo de Mapeo de Iconos - Aurora Nova
 *
 * Proporciona función helper para resolver iconos de Lucide React basado en string names.
 * Maneja resolución segura de iconos con fallback a icono por defecto.
 *
 * **Arquitectura**:
 * - Usa Lucide React como librería de iconos
 * - Acceso dinámico a componentes de icono por nombre
 * - Validación de existencia con type checking
 * - Fallback automático a Circle si no existe
 *
 * **Uso Principal**:
 * - Renderizar iconos en menú: Icon en table menu items
 * - Renderizar iconos en breadcrumbs
 * - Renderizar iconos en botones de acción
 * - UI componentes que muestren iconos dinámicamente
 *
 * **Librería de Iconos**:
 * - **Lucide React**: 450+ iconos, moderno, minimalista
 * - Importados como: `import * as LucideIcons from 'lucide-react'`
 * - Accesibles por nombre (ej: "Settings", "Users", "Menu")
 *
 * **Flujo de Resolución**:
 * ```
 * getIcon("Settings")
 *   ↓ (Validar null/undefined)
 * "Settings" no es null
 *   ↓ (Buscar en LucideIcons)
 * LucideIcons["Settings"] = SettingsComponent (función)
 *   ↓ (Validar que es función)
 * typeof SettingsComponent === 'function' ✓
 *   ↓ (Retornar componente)
 * SettingsComponent as LucideIcon
 * ```
 *
 * **Casos de Uso**:
 * - Menu items en admin panel: icono dinámico del menú
 * - RBAC permissions: mostrar icono según permiso
 * - Actions table: icono de acción (Edit, Delete, View)
 * - Sidebar navigation: iconos dinámicos
 *
 * @module admin/utils/icon-mapper
 * @see {@link https://lucide.dev} para lista completa de iconos
 * @see {@link @/modules/admin/types/menu} para uso en menú
 * @see {@link @/modules/admin/hooks/use-audit-logs} para uso en componentes
 */

import * as LucideIcons from 'lucide-react'
import { LucideIcon } from 'lucide-react'

/**
 * Resuelve un nombre de icono a componente Lucide React
 *
 * **Propósito**: Permitir almacenar nombres de iconos en BD (strings) y resolverlos
 * a componentes React en tiempo de renderizado.
 *
 * **Lógica**:
 * 1. Validar que iconName no sea null/undefined → retornar Circle
 * 2. Acceso dinámico: `LucideIcons[iconName]`
 * 3. Validar que es función React → si no, retornar Circle + warning
 * 4. Retornar componente validado
 *
 * **Type Safety**:
 * - `iconName as keyof typeof LucideIcons`: Asegura que búsqueda es segura
 * - typeof check: Verifica que es un componente de función
 * - Retorno: `IconComponent as LucideIcon` con tipado correcto
 *
 * **Iconos Disponibles** (450+ en Lucide React):
 * - **UI**: Menu, X, ChevronDown, Settings, Bell, Heart, etc.
 * - **Acciones**: Edit, Trash2, Copy, Download, Upload, Share2, etc.
 * - **Status**: Check, AlertCircle, Info, HelpCircle, RotateCcw, etc.
 * - **Navegación**: ChevronRight, Home, LogOut, Login, RotateCcw, etc.
 * - **Objetos**: Users, Briefcase, ShoppingCart, Mail, Phone, etc.
 * - **Categorías**: Layout, Grid, List, BarChart, PieChart, LineChart, etc.
 *
 * **Parámetro iconName**:
 * - PascalCase (ej: "Settings", "Users", "Menu", "LogOut")
 * - null: Validado y retorna Circle
 * - undefined: Validado y retorna Circle
 * - invalid (no existe): Warning en console, retorna Circle
 * - No case-sensitive en busca (la librería usa PascalCase)
 *
 * **Fallback**: Circle (O vacío)
 * - Usado cuando: iconName es null, undefined, o no existe
 * - Razón: Mejor mostrar algo que error
 * - Ventaja: UI no se rompe si BD tiene icon name inválido
 *
 * **Casos de Uso en Aurora Nova**:
 * ```typescript
 * // Menú admin con iconos dinámicos
 * const menuItem = await getMenuForUser(userId)
 * // menuItem: { id: 1, label: 'Settings', icon: 'Settings', ... }
 *
 * // Renderizar ícono en React
 * const IconComponent = getIcon(menuItem.icon)  // SettingsComponent
 * return <IconComponent size={24} />
 * ```
 *
 * **Comparación: Hard-coded vs Dynamic**:
 * ```typescript
 * // ❌ Hard-coded (inflexible)
 * if (item.action === 'edit') return <Edit />
 * if (item.action === 'delete') return <Trash2 />
 *
 * // ✅ Dynamic (flexible, soporta cambios en BD)
 * const Icon = getIcon(item.icon)
 * return <Icon />
 * ```
 *
 * **Performance**:
 * - O(1) - Búsqueda de propiedad en objeto
 * - Seguro llamar en render (React optimiza)
 * - Recomendación: Memoizar si se usa en listas grandes
 *
 * **Integración con Menú**:
 * ```typescript
 * // En menu-queries.ts: getMenuForUser()
 * const menu = await prisma.menuItem.findMany({
 *   where: { ... },
 *   select: {
 *     id: true,
 *     label: true,
 *     icon: true,  // String del icono (ej: "Settings")
 *     href: true
 *   }
 * })
 *
 * // En componente React
 * menu.forEach(item => {
 *   const Icon = getIcon(item.icon)  // Resuelve string → componente
 *   return (
 *     <a href={item.href} key={item.id}>
 *       <Icon size={20} />
 *       <span>{item.label}</span>
 *     </a>
 *   )
 * })
 * ```
 *
 * **Iconos Recomendados para Aurora Nova**:
 * ```
 * Admin:
 * - "Settings": Configuración
 * - "Users": Gestión de usuarios
 * - "Lock": Permisos/Seguridad
 * - "ShoppingCart": Órdenes
 * - "BarChart": Reportes
 * - "FileText": Documentos
 *
 * Acciones:
 * - "Edit": Editar
 * - "Trash2": Eliminar
 * - "Eye": Ver
 * - "Copy": Copiar
 * - "Download": Descargar
 * - "Upload": Subir
 *
 * Status:
 * - "Check": Completado
 * - "AlertCircle": Alerta
 * - "Info": Información
 * - "X": Cerrar/Cancelar
 * - "Clock": Pendiente
 * ```
 *
 * **Errores Posibles**:
 * ```typescript
 * // Error: nombre inválido
 * getIcon("InvalidIcon")
 * // Console output: "Ícono no encontrado: InvalidIcon"
 * // Return: LucideIcons.Circle (fallback)
 *
 * // Success: nombre válido
 * getIcon("Settings")
 * // Return: LucideIcons.Settings (componente)
 *
 * // Success: null/undefined
 * getIcon(null)
 * // Return: LucideIcons.Circle (fallback directo)
 * ```
 *
 * **Mejora Futura: Caching**:
 * ```typescript
 * // Cachear iconos resueltos para mejor performance
 * const iconCache = new Map<string, LucideIcon>()
 *
 * export function getIcon(iconName: string | null | undefined): LucideIcon {
 *   if (!iconName) return LucideIcons.Circle
 *
 *   if (iconCache.has(iconName)) {
 *     return iconCache.get(iconName)!
 *   }
 *
 *   const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons]
 *   if (!IconComponent || typeof IconComponent !== 'function') {
 *     console.warn(`Ícono no encontrado: ${iconName}`)
 *     return LucideIcons.Circle
 *   }
 *
 *   iconCache.set(iconName, IconComponent as LucideIcon)
 *   return IconComponent as LucideIcon
 * }
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('getIcon', () => {
 *   it('debería retornar componente válido para icono existente', () => {
 *     const Icon = getIcon('Settings')
 *     expect(typeof Icon).toBe('function')
 *     expect(Icon.name).toContain('Settings')
 *   })
 *
 *   it('debería retornar Circle para null', () => {
 *     const Icon = getIcon(null)
 *     expect(Icon).toBe(LucideIcons.Circle)
 *   })
 *
 *   it('debería retornar Circle y loguear warning para icono inválido', () => {
 *     const spy = jest.spyOn(console, 'warn')
 *     const Icon = getIcon('InvalidIcon')
 *     expect(Icon).toBe(LucideIcons.Circle)
 *     expect(spy).toHaveBeenCalledWith('Ícono no encontrado: InvalidIcon')
 *   })
 * })
 * ```
 *
 * @param {string | null | undefined} iconName - Nombre del icono en PascalCase
 *   (ej: "Settings", "Users", "Edit", "Trash2")
 *   - null: Retorna Circle
 *   - undefined: Retorna Circle
 *   - Válido: Retorna componente Lucide React
 *   - Inválido: Warning + retorna Circle
 *
 * @returns {LucideIcon} Componente React de icono Lucide
 *
 * @example
 * // Icono válido
 * const SettingsIcon = getIcon('Settings')
 * // Retorna: LucideIcons.Settings (SettingsComponent)
 *
 * @example
 * // Null/undefined
 * const DefaultIcon = getIcon(null)
 * // Retorna: LucideIcons.Circle (fallback)
 *
 * @example
 * // Inválido (loguea warning)
 * const UnknownIcon = getIcon('NonExistent')
 * // Console: "Ícono no encontrado: NonExistent"
 * // Retorna: LucideIcons.Circle (fallback)
 *
 * @example
 * // Uso en componente React
 * function MenuItemRenderer({ icon, label }: MenuItemProps) {
 *   const Icon = getIcon(icon)
 *   return (
 *     <li>
 *       <Icon size={20} className="inline mr-2" />
 *       <span>{label}</span>
 *     </li>
 *   )
 * }
 *
 * @see https://lucide.dev para búsqueda de iconos disponibles
 * @see {@link parseUserAgent} en session-utils.ts para patrón similar
 * @see {@link getMenuForUser} en menu-queries.ts para datos de menú con iconos
 */
export function getIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return LucideIcons.Circle

  // Mapeo seguro con type checking
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons]

  if (!IconComponent || typeof IconComponent !== 'function') {
    console.warn(`Ícono no encontrado: ${iconName}`)
    return LucideIcons.Circle // Ícono por defecto
  }

  return IconComponent as LucideIcon
}
