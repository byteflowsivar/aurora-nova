/**
 * Módulo de Tipos Compartidos - Aurora Nova
 *
 * Centraliza todas las definiciones de tipos compartidas entre módulos.
 * Este índice re-exporta tipos de archivos individuales que se usan en todo el proyecto.
 *
 * **Temas Incluidos**:
 *
 * **1. Autenticación y Autorización** (desde auth.ts):
 * - **DTOs de Login**: `LoginCredentials`, `RegisterData`, `ChangePasswordData`
 * - **DTOs de Reset**: `ResetPasswordData`, `SetPasswordData`
 * - **RBAC**: `UserRole`, `Permission`, `RoleWithPermissions`, `UserWithRolesAndPermissions`
 * - **Respuestas API**: `AuthResponse`, `PermissionCheckResponse`, `RoleAssignmentResponse`
 * - **Middleware**: `AuthMiddlewareConfig`, `AuthContext`
 * - **Validación**: `PasswordValidationRules`, `ValidationResult`
 * - **Eventos**: `AuthEvent`, `AuthEventPayload`
 * - **Config**: `AuthConfig` con configuración de sesión, contraseña, email, seguridad
 *
 * **2. Gestión de Sesiones Híbridas** (desde session.ts):
 * - `SessionInfo`: Información completa de sesión (de BD)
 * - `CreateSessionData`: Datos para crear sesión (desde JWT)
 * - `SessionDetails`: SessionInfo enriquecida con device parseado (para UI)
 * - `ListSessionsOptions`: Opciones para listar sesiones del usuario
 * - `SessionOperationResult`: Resultado de operación (create, delete, logout)
 *
 * Arquitectura híbrida:
 * - JWT (autofirmado, sin BD) para autenticación rápida
 * - Base de datos (tabla sessions) para gestión manual y revocación
 * - IP/UserAgent: auditoría y detección de actividad sospechosa
 * - Múltiples sesiones: gestionar dispositivos del usuario
 *
 * **3. Server Actions - Respuestas Estándar** (desde action-response.ts):
 * - `ActionSuccess<T>`: Respuesta exitosa con datos genéricos
 * - `ActionError`: Respuesta de error con validaciones por campo
 * - `ActionResponse<T>`: Union discriminada (éxito | error)
 * - **Helpers**: `successResponse()`, `errorResponse()`
 * - **Type Guards**: `isActionSuccess()`, `isActionError()`
 *
 * Patrón de respuesta consistente:
 * ```typescript
 * // Server Action
 * async function myAction(data: Data): Promise<ActionResponse<Result>> {
 *   try {
 *     const result = await process(data)
 *     return successResponse(result, 'Éxito')
 *   } catch (error) {
 *     if (error instanceof ZodError) {
 *       return errorResponse('Validación fallida', error.flatten().fieldErrors)
 *     }
 *     return errorResponse('Error del servidor')
 *   }
 * }
 *
 * // Cliente
 * const response = await myAction(data)
 * if (isActionSuccess(response)) {
 *   console.log(response.data)
 * } else {
 *   console.error(response.error)
 * }
 * ```
 *
 * **Importar desde este índice**:
 * ```typescript
 * // Correcto: desde índice para fácil descubrimiento
 * import {
 *   LoginCredentials,
 *   UserWithRolesAndPermissions,
 *   SessionInfo,
 *   ActionResponse,
 *   successResponse
 * } from '@/modules/shared/types'
 *
 * // También válido: desde archivo individual
 * import type { LoginCredentials } from '@/modules/shared/types/auth'
 * ```
 *
 * **Patrón de Re-exports**:
 * Este archivo usa `export * from './file'` para:
 * - Centralizar punto de entrada
 * - Facilitar descubrimiento de tipos disponibles
 * - Permitir refactorización sin romper imports externos
 * - Mantener consistencia con patrón de admin/types
 *
 * **Relación Jerárquica de Tipos**:
 * ```
 * src/types/ (Global)
 *   ├── auth.ts (tipos base: User, Role, Permission)
 *   └── next-auth.d.ts (module augmentation para NextAuth)
 *
 * modules/shared/types/ (Compartidos - DTOs, respuestas)
 *   ├── auth.ts (LoginCredentials, UserWithRolesAndPermissions, etc)
 *   ├── session.ts (SessionInfo, CreateSessionData, etc)
 *   └── action-response.ts (ActionResponse, helpers)
 *
 * modules/admin/types/ (Específico del admin)
 *   ├── permissions.ts (SYSTEM_PERMISSIONS, constantes)
 *   ├── menu.ts (MenuItem, MenuGroup)
 *   └── profile.ts (UserProfile, UpdateProfileData)
 * ```
 *
 * **Diferencia entre Global y Compartido**:
 * - **Global** (src/types/auth.ts): Definiciones de entidades BD (User, Role, Permission)
 * - **Compartido** (modules/shared/types/auth.ts): DTOs para API (LoginCredentials, AuthResponse)
 * - **Admin** (modules/admin/types): Tipos específicos del módulo admin
 *
 * @module shared/types
 * @see {@link ./auth.ts} para autenticación, RBAC, respuestas API
 * @see {@link ./session.ts} para gestión de sesiones híbridas JWT + BD
 * @see {@link ./action-response.ts} para patrón de respuesta de Server Actions
 * @see {@link ../../../types/auth.ts} para tipos globales de entidades
 * @see {@link ../api} para funciones que usan estos tipos
 * @see {@link ../validations} para Zod schemas de validación
 */

export * from './auth'
export * from './session'
export * from './action-response'
