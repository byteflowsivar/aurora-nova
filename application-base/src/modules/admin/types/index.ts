/**
 * Módulo de Tipos del Admin - Aurora Nova
 *
 * Centraliza todas las definiciones de tipos específicas del módulo admin.
 * Este índice re-exporta tipos de archivos individuales para fácil descubrimiento y mantenimiento.
 *
 * **Temas Incluidos**:
 *
 * **1. Permisos y Control de Acceso** (desde permissions.ts):
 * - `PERMISSION_MODULES`: Enum de módulos del sistema (USER, ROLE, PERMISSION, AUDIT)
 * - `PERMISSION_ACTIONS`: Enum de acciones (CREATE, READ, UPDATE, DELETE, LIST, MANAGE)
 * - `PermissionInfo`: Información de permiso con validación
 * - `RoleInfo`: Información simplificada de rol
 * - `PermissionCheckResult`: Resultado de verificación de permiso
 * - `PermissionCheckOptions`: Opciones para verificar con AND/OR logic
 * - `SYSTEM_PERMISSIONS`: Constantes de permisos predefinidos (16 permisos)
 * - Tipos de inferencia para autocompletar: `RolePermissionType`, `PermissionKeyType`, etc.
 *
 * **2. Estructura de Menús Dinámicos** (desde menu.ts):
 * - `MenuItem`: Elemento individual del menú (link, icono, permiso)
 * - `MenuGroup`: Grupo de items (para dropdowns/colapsables)
 * - `MenuHierarchy`: Estructura jerárquica completa del menú
 * - Soporte para permisos: filtrado automático por acceso del usuario
 * - Iconos: integración con Lucide React
 * - Ordenamiento: control de orden de items
 *
 * **3. Datos de Perfil de Usuario** (desde profile.ts):
 * - `UserProfile`: Información completa del perfil (email, nombre, roles, etc)
 * - `UpdateProfileData`: Datos para actualizar perfil (nombre, apellido, imagen)
 * - `ChangePasswordData`: Interfaz para cambio de contraseña
 * - Zod schemas: validación de datos con `.refine()` personalizado
 * - Ejemplos: cambio de contraseña, actualización de perfil
 *
 * **Uso - Importar desde este índice**:
 * ```typescript
 * // Correcto: desde índice
 * import {
 *   SYSTEM_PERMISSIONS,
 *   MenuItem,
 *   UserProfile,
 *   ChangePasswordData
 * } from '@/modules/admin/types'
 *
 * // También válido: desde archivo individual si necesitas un tipo específico
 * import { PermissionInfo } from '@/modules/admin/types/permissions'
 * ```
 *
 * **Patrón de Re-exports**:
 * Este archivo usa el patrón `export * from './file'` para:
 * - Centralizar punto de entrada
 * - Facilitar búsqueda de tipos
 * - Permitir refactorización sin romper imports externos
 * - Mantener consistencia con patrón de shared/types
 *
 * **Relación con otros módulos**:
 * - `shared/types`: Tipos comunes (User, Role, Permission, Session)
 * - `types/auth.ts` (global): Tipos globales de autenticación
 * - `types/next-auth.d.ts`: Module augmentation para NextAuth
 *
 * @module admin/types
 * @see {@link ./permissions.ts} para tipos de RBAC y constantes
 * @see {@link ./menu.ts} para estructura de menús dinámicos
 * @see {@link ./profile.ts} para datos de perfil y Zod schemas
 * @see {@link ../../../modules/shared/types} para tipos compartidos
 */

export * from './permissions'
export * from './menu'
export * from './profile'
