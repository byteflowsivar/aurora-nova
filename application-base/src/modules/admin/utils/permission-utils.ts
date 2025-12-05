/**
 * Módulo de Utilidades para Verificación de Permisos - Aurora Nova
 *
 * Proporciona funciones helper para verificación de permisos RBAC (Role-Based Access Control).
 * Abstracciones sobre funciones de servicios para mejor ergonomía y type-safety.
 *
 * **Arquitectura**:
 * - **RBAC System**: Role-Based Access Control implementado en Aurora Nova
 * - **Permisos**: Identificadores únicos (ej: "user:create", "user:update", "role:delete")
 * - **Roles**: Conjuntos de permisos asignados a usuarios
 * - **Verificación**: AND logic (todos), OR logic (alguno), o individual
 *
 * **Capas de Funciones**:
 * 1. **Server Functions** (async): `hasPermission`, `hasPermissions`, `hasAnyPermission`, `hasAllPermissions`
 *    - Consultan BD en tiempo real
 *    - Usadas en server actions y server components
 *    - Seguras contra cambios de permisos
 *
 * 2. **Client Functions** (sync): `checkPermission`, `checkAnyPermission`, `checkAllPermissions`
 *    - Operan sobre array de permisos pre-cargado
 *    - Usadas en client components
 *    - Para evitar N+1 queries, cargar permisos una sola vez
 *
 * **Tipos de Verificación**:
 * - **Individual**: ¿Usuario tiene ESTE permiso?
 * - **Todos (AND)**: ¿Usuario tiene TODOS estos permisos?
 * - **Alguno (OR)**: ¿Usuario tiene AL MENOS UNO de estos permisos?
 *
 * **Formato de Permisos**:
 * - Patrón: "entidad:acción" (ej: "user:create", "role:delete")
 * - Entidades: user, role, permission, menu, audit, etc.
 * - Acciones: create, read, update, delete, list, manage
 *
 * **Casos de Uso**:
 * - Proteger rutas en servidor (middleware)
 * - Proteger acciones de servidor (server actions)
 * - Renderizar UI condicionalmente (mostrar/ocultar botones)
 * - Auditoría de acceso
 * - Autorización granular
 *
 * **Flujo Típico**:
 * ```
 * 1. Usuario hace login
 * 2. Sistema genera JWT + session
 * 3. En server action/component: consultar permisos
 * 4. Verificar si tiene permiso requerido
 * 5. Si SÍ → continuar
 * 6. Si NO → retornar error 403 Forbidden
 * ```
 *
 * @module admin/utils/permission-utils
 * @see {@link @/modules/admin/services} para servicios subyacentes
 * @see {@link @/modules/admin/types} para tipos PermissionCheckOptions, PermissionCheckResult
 * @see {@link @/lib/auth} para contexto de autenticación
 */

import {
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
} from "@/modules/admin/services"
import type {
  PermissionCheckOptions,
  PermissionCheckResult,
  SystemPermission,
} from "@/modules/admin/types"

// ============================================================================
// VERIFICACIÓN DE PERMISOS (SERVIDOR)
// ============================================================================

/**
 * Verifica si un usuario tiene un permiso específico
 *
 * **Propósito**: Helper con mejor ergonomía para verificar un permiso en server context.
 *
 * **Función Subyacente**: `userHasPermission()` (service layer)
 *
 * **Comportamiento**:
 * 1. Consulta la BD en tiempo real (no cacheado)
 * 2. Verifica rol del usuario
 * 3. Verifica si rol tiene el permiso
 * 4. Retorna boolean
 *
 * **Seguridad**:
 * - Consulta BD en cada llamada (cambios inmediatos)
 * - No confía en JWT (JWT solo para identidad)
 * - Ideal para operaciones sensibles
 *
 * **Contexto de Uso**:
 * - Server actions (POST /api/users, etc.)
 * - Server components
 * - Middleware de protección
 * - Validación antes de modificar datos
 *
 * **Parámetros**:
 * - `userId`: ID del usuario (string UUID)
 * - `permission`: Permiso a verificar (ej: "user:create")
 *   - Puede ser string directo
 *   - O constante SystemPermission (recomendado para type-safety)
 *
 * **Retorno**: Promise<boolean>
 * - true: Usuario tiene el permiso
 * - false: Usuario NO tiene el permiso
 *
 * **Casos de Uso**:
 * - Proteger server action que crea usuario
 * - Proteger API route que modifica datos
 * - Validar permiso antes de mostrar componente sensible
 *
 * **Performance**:
 * - 1-2 queries a BD (user + permissions)
 * - Cache: ninguno (always fresh)
 * - Recomendación: no llamar por cada fila en bucle (use getPermissions + client check)
 *
 * **Comparación: hasPermission vs checkPermission**:
 * ```
 * hasPermission (servidor):
 * ✓ Seguro (consulta BD)
 * ✓ No modificable por cliente
 * ✗ Más lento (I/O)
 * ✗ No puede usar en client component
 * Uso: Acciones sensibles
 *
 * checkPermission (cliente):
 * ✓ Rápido (memoria)
 * ✓ Puede usar en client component
 * ✗ Requiere pre-cargar permisos
 * ✗ Puede ser spoofed si no se valida en servidor
 * Uso: Renderizado UI, UX
 * ```
 *
 * **Flujo de Autorización Completo**:
 * ```typescript
 * // En server action
 * const canCreate = await hasPermission(userId, 'user:create')
 * if (!canCreate) {
 *   throw new Error('No tienes permiso para crear usuarios')
 * }
 *
 * // Si llegamos aquí, tiene permiso
 * const newUser = await createUserInDatabase(...)
 * await auditOperation({
 *   userId,
 *   action: 'create_user',
 *   module: 'users',
 *   ...
 * })
 * ```
 *
 * **Ejemplos de Permisos**:
 * ```typescript
 * // String directo (menos seguro, typos pueden pasar)
 * await hasPermission(userId, 'user:create')
 *
 * // Constante (recomendado, type-safe)
 * import { SYSTEM_PERMISSIONS } from '@/modules/admin/types'
 * await hasPermission(userId, SYSTEM_PERMISSIONS.USER_CREATE)
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('hasPermission', () => {
 *   it('debería retornar true si usuario tiene permiso', async () => {
 *     const hasIt = await hasPermission(userId, 'user:create')
 *     expect(hasIt).toBe(true)
 *   })
 *
 *   it('debería retornar false si usuario no tiene permiso', async () => {
 *     const hasIt = await hasPermission(userId, 'admin:delete')
 *     expect(hasIt).toBe(false)
 *   })
 * })
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario a verificar
 * @param {string | SystemPermission} permission - Permiso a verificar
 *   - Formato: "entidad:acción" (ej: "user:create")
 *   - Ejemplos válidos:
 *     - "user:create", "user:read", "user:update", "user:delete"
 *     - "role:create", "role:update", "role:delete"
 *     - "permission:manage", "audit:view"
 *
 * @returns {Promise<boolean>} true si usuario tiene el permiso, false caso contrario
 *
 * @example
 * // String directo
 * if (await hasPermission(userId, 'user:create')) {
 *   // Usuario puede crear usuarios
 * }
 *
 * @example
 * // Con TypeScript autocompletion usando constante
 * import { SYSTEM_PERMISSIONS } from '@/modules/admin/types'
 * if (await hasPermission(userId, SYSTEM_PERMISSIONS.USER_CREATE)) {
 *   // Usuario puede crear usuarios
 * }
 *
 * @example
 * // En server action protegido
 * async function createUserAction(data: CreateUserData) {
 *   const session = await getSession()
 *   const canCreate = await hasPermission(session.userId, 'user:create')
 *   if (!canCreate) {
 *     throw new Error('Forbidden: no permission to create users')
 *   }
 *   // Crear usuario
 * }
 *
 * @see {@link getPermissions} para obtener todos los permisos (luego usar checkPermission)
 * @see {@link hasPermissions} para verificar múltiples permisos (AND/OR)
 * @see {@link checkPermission} para versión cliente (requiere pre-cargar permisos)
 */
export async function hasPermission(
  userId: string,
  permission: string | SystemPermission
): Promise<boolean> {
  return await userHasPermission(userId, permission)
}

/**
 * Verifica si un usuario tiene múltiples permisos (AND/OR)
 *
 * **Propósito**: Verificar múltiples permisos con lógica configurable (todos vs alguno).
 *
 * **Modes de Verificación**:
 * - **requireAll: true** (default): Usuario DEBE tener TODOS los permisos (AND)
 * - **requireAll: false**: Usuario DEBE tener AL MENOS UNO (OR)
 *
 * **Retorno: PermissionCheckResult**:
 * ```typescript
 * {
 *   hasPermission: boolean,        // true/false
 *   missingPermissions?: string[]  // Solo si requireAll=true y falta algo
 * }
 * ```
 *
 * **Casos de Uso**:
 * - Requerir TODOS para operación compleja: crear + actualizar + eliminar
 * - Requerir AL MENOS UNO para lectura: ver reportes O descargar datos
 *
 * **Flujo AND (requireAll: true)**:
 * ```
 * Permisos requeridos: ['user:create', 'user:update', 'user:delete']
 * Permisos del usuario: ['user:create', 'user:update']
 *
 * Verificación:
 * - 'user:create' ∈ usuario? SÍ
 * - 'user:update' ∈ usuario? SÍ
 * - 'user:delete' ∈ usuario? NO ❌
 *
 * Resultado:
 * {
 *   hasPermission: false,
 *   missingPermissions: ['user:delete']
 * }
 * ```
 *
 * **Flujo OR (requireAll: false)**:
 * ```
 * Permisos requeridos: ['user:create', 'user:update', 'user:delete']
 * Permisos del usuario: ['user:create', 'user:update']
 *
 * Verificación:
 * - Al menos uno de los requeridos está en usuario? SÍ ('user:create') ✓
 *
 * Resultado:
 * {
 *   hasPermission: true
 * }
 * ```
 *
 * **Performance**:
 * - AND: 1 query a BD (igual que hasAllPermissions)
 * - OR: 1 query a BD (igual que hasAnyPermission)
 * - Tiempo: ~50-200ms (dependiendo de BD)
 *
 * **Alternativas**:
 * - `hasAnyPermission()`: Alias para requireAll: false
 * - `hasAllPermissions()`: Alias para requireAll: true
 * - `hasPermission()`: Para verificar un solo permiso
 *
 * **Testing**:
 * ```typescript
 * describe('hasPermissions', () => {
 *   describe('AND mode (requireAll: true)', () => {
 *     it('debe retornar true si tiene todos', async () => {
 *       const result = await hasPermissions(userId, ['user:create', 'user:read'])
 *       expect(result.hasPermission).toBe(true)
 *     })
 *
 *     it('debe retornar false y listar faltantes', async () => {
 *       const result = await hasPermissions(userId, ['user:create', 'admin:delete'])
 *       expect(result.hasPermission).toBe(false)
 *       expect(result.missingPermissions).toContain('admin:delete')
 *     })
 *   })
 *
 *   describe('OR mode (requireAll: false)', () => {
 *     it('debe retornar true si tiene al menos uno', async () => {
 *       const result = await hasPermissions(
 *         userId,
 *         ['user:create', 'admin:delete'],
 *         { requireAll: false }
 *       )
 *       expect(result.hasPermission).toBe(true)
 *     })
 *   })
 * })
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string[]} permissions - Array de permisos a verificar
 * @param {PermissionCheckOptions} [options={}] - Opciones de verificación
 *   - requireAll: boolean (default: true)
 *
 * @returns {Promise<PermissionCheckResult>} Resultado de verificación
 *   - hasPermission: boolean
 *   - missingPermissions?: string[] (solo si AND y falta algo)
 *
 * @example
 * // AND mode (default): requerir TODOS
 * const result = await hasPermissions(userId, ['user:create', 'user:update'])
 * if (result.hasPermission) {
 *   // Usuario puede crear Y actualizar
 * } else {
 *   console.log('Falta:', result.missingPermissions)
 * }
 *
 * @example
 * // OR mode: requerir AL MENOS UNO
 * const result = await hasPermissions(
 *   userId,
 *   ['user:create', 'user:update'],
 *   { requireAll: false }
 * )
 * if (result.hasPermission) {
 *   // Usuario puede crear O actualizar (o ambos)
 * }
 *
 * @see {@link hasPermission} para verificar un solo permiso
 * @see {@link hasAllPermissions} para AND directo
 * @see {@link hasAnyPermission} para OR directo
 * @see {@link checkAllPermissions} para versión cliente
 */
export async function hasPermissions(
  userId: string,
  permissions: string[],
  options: PermissionCheckOptions = {}
): Promise<PermissionCheckResult> {
  const { requireAll = true } = options

  if (requireAll) {
    // Requiere TODOS los permisos
    return await userHasAllPermissions(userId, permissions)
  } else {
    // Requiere AL MENOS UNO
    const hasAny = await userHasAnyPermission(userId, permissions)
    return { hasPermission: hasAny }
  }
}

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos (OR)
 *
 * **Propósito**: Alias ergonómico para verificación OR (alguno) de permisos.
 *
 * **Equivalente a**: `hasPermissions(userId, perms, { requireAll: false })`
 *
 * **Lógica**:
 * - Verifica si ALGUNO de los permisos está en el usuario
 * - Retorna true si ALGUNO existe
 * - Retorna false si NINGUNO existe
 *
 * **Casos de Uso**:
 * - Acciones alternativas: usuario puede editar O crear
 * - Vistas opcionales: puede ver reportes O descargar datos
 * - Roles alternativos: admin O supervisor
 *
 * **Performance**:
 * - 1 query a BD
 * - Más rápido que hasAllPermissions en promedio
 * - O(n) donde n = número de permisos a verificar
 *
 * **Comparación OR vs AND**:
 * ```
 * hasAnyPermission(['a', 'b', 'c']) vs userPerms ['a', 'x']:
 * - Búsqueda: ¿existe 'a'? SÍ → true (no sigue buscando)
 * - Rápido por cortocircuito
 *
 * hasAllPermissions(['a', 'b', 'c']) vs userPerms ['a', 'x']:
 * - Búsqueda: ¿existe 'a'? SÍ ¿existe 'b'? NO → false
 * - Más lento, verifica todos
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string[]} permissions - Array de permisos (al menos uno debe existir)
 *
 * @returns {Promise<boolean>} true si usuario tiene AL MENOS UNO
 *
 * @example
 * // Usuario puede editar O crear usuarios
 * if (await hasAnyPermission(userId, ['user:create', 'user:update'])) {
 *   // Mostrar formulario de usuario
 * }
 *
 * @example
 * // Usuario puede ver reportes O descargar datos
 * if (await hasAnyPermission(userId, ['report:view', 'data:download'])) {
 *   // Mostrar botones de descarga
 * }
 *
 * @see {@link hasPermissions} para verificación configurable (AND/OR)
 * @see {@link hasAllPermissions} para verificación AND (todos)
 * @see {@link checkAnyPermission} para versión cliente
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  return await userHasAnyPermission(userId, permissions)
}

/**
 * Verifica si un usuario tiene TODOS los permisos (AND)
 *
 * **Propósito**: Alias ergonómico para verificación AND (todos) de permisos.
 *
 * **Equivalente a**: `hasPermissions(userId, perms, { requireAll: true })`
 *
 * **Lógica**:
 * - Verifica si TODOS los permisos están en el usuario
 * - Retorna true solo si TODOS existen
 * - Retorna false si ALGUNO falta
 * - Incluye lista de permisos faltantes
 *
 * **Casos de Uso**:
 * - Operaciones administrativas: crear + actualizar + eliminar
 * - Acciones complejas: requieren múltiples permisos
 * - Auditoría: verificar acceso múltiple
 *
 * **Retorno: PermissionCheckResult**:
 * ```typescript
 * {
 *   hasPermission: boolean,       // true solo si tiene TODOS
 *   missingPermissions?: string[] // Lista de los que faltan
 * }
 * ```
 *
 * **Performance**:
 * - 1 query a BD
 * - Más lento que hasAnyPermission (verifica todos)
 * - O(n) donde n = número de permisos requeridos
 *
 * **Diferencia hasAnyPermission vs hasAllPermissions**:
 * ```
 * Requeridos: ['a', 'b', 'c']
 * Usuario tiene: ['a', 'x', 'y']
 *
 * hasAnyPermission → true (tiene 'a')
 * hasAllPermissions → false (falta 'b' y 'c')
 *   → missingPermissions: ['b', 'c']
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('hasAllPermissions', () => {
 *   it('debe retornar true si tiene todos', async () => {
 *     const result = await hasAllPermissions(userId, ['user:create', 'user:read'])
 *     expect(result.hasPermission).toBe(true)
 *     expect(result.missingPermissions).toBeUndefined()
 *   })
 *
 *   it('debe retornar false y listar faltantes', async () => {
 *     const result = await hasAllPermissions(userId, ['user:create', 'admin:delete'])
 *     expect(result.hasPermission).toBe(false)
 *     expect(result.missingPermissions).toContain('admin:delete')
 *   })
 * })
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 * @param {string[]} permissions - Array de permisos (TODOS deben existir)
 *
 * @returns {Promise<PermissionCheckResult>} Resultado con hasPermission y missingPermissions
 *   - hasPermission: true si tiene TODOS, false si falta alguno
 *   - missingPermissions: array de faltantes (solo si faltan)
 *
 * @example
 * // Usuario debe poder crear Y actualizar usuarios
 * const result = await hasAllPermissions(userId, ['user:create', 'user:update'])
 * if (result.hasPermission) {
 *   // Usuario tiene ambos permisos
 * } else {
 *   // Usuario falta: result.missingPermissions
 * }
 *
 * @example
 * // Operación sensitiva requiere múltiples permisos
 * const result = await hasAllPermissions(userId, [
 *   'user:create',
 *   'user:update',
 *   'audit:create'
 * ])
 * if (!result.hasPermission) {
 *   throw new Error(`Missing permissions: ${result.missingPermissions.join(', ')}`)
 * }
 *
 * @see {@link hasPermissions} para verificación configurable (AND/OR)
 * @see {@link hasAnyPermission} para verificación OR (alguno)
 * @see {@link checkAllPermissions} para versión cliente
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[]
): Promise<PermissionCheckResult> {
  return await userHasAllPermissions(userId, permissions)
}

/**
 * Obtiene TODOS los permisos de un usuario
 *
 * **Propósito**: Recuperar lista completa de permisos para análisis o cacheo en cliente.
 *
 * **Cuándo Usar**:
 * - **Inicialización de estado**: Cargar permisos al iniciar app
 * - **Verificaciones en cliente**: Usar con checkPermission, checkAnyPermission, etc.
 * - **Análisis/Auditoría**: Inspeccionar qué puede hacer un usuario
 * - **Optimización**: Cargar UNA VEZ en session provider, no por cada acción
 *
 * **Retorno**: Array de strings
 * - Ejemplo: ['user:create', 'user:read', 'role:list', 'audit:view']
 * - Orden: no importa
 * - Duplicados: no hay
 * - Puede estar vacío si usuario sin permisos
 *
 * **Performance**:
 * - 1-2 queries a BD (user + permissions)
 * - Resultado es cacheable
 * - Recomendación: cachar 5-30 minutos
 *
 * **Arquitectura Recomendada**:
 * ```typescript
 * // En session provider o contexto:
 * // 1. Al iniciar, cargar permisos UNA VEZ
 * const permissions = await getPermissions(userId)
 *
 * // 2. Guardar en contexto/estado
 * // 3. En client components, usar checkPermission(permissions, 'user:create')
 * // 4. En server actions, verificar con hasPermission si es crítico
 * ```
 *
 * **Integración con Session Provider**:
 * ```typescript
 * // providers/session-provider.tsx
 * export function SessionProvider({ children, session }) {
 *   const [permissions, setPermissions] = useState<string[]>([])
 *
 *   useEffect(() => {
 *     async function loadPermissions() {
 *       const perms = await getPermissions(session.userId)
 *       setPermissions(perms)
 *     }
 *     loadPermissions()
 *   }, [session.userId])
 *
 *   return (
 *     <AuthContext.Provider value={{ session, permissions }}>
 *       {children}
 *     </AuthContext.Provider>
 *   )
 * }
 *
 * // En client component
 * function MyComponent() {
 *   const { permissions } = useContext(AuthContext)
 *   const canCreate = checkPermission(permissions, 'user:create')
 *   if (!canCreate) return null
 *   return <CreateUserForm />
 * }
 * ```
 *
 * **Casos de Uso Avanzados**:
 * ```typescript
 * // Verificar nivel de acceso
 * const allPerms = await getPermissions(userId)
 * const isAdmin = allPerms.length > 10  // Heurístico
 *
 * // Filtrar acciones disponibles
 * const allActions = [
 *   { id: 'create', perm: 'user:create' },
 *   { id: 'update', perm: 'user:update' },
 *   { id: 'delete', perm: 'user:delete' }
 * ]
 * const availableActions = allActions.filter(
 *   a => checkPermission(allPerms, a.perm)
 * )
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('getPermissions', () => {
 *   it('debería retornar array de permisos', async () => {
 *     const perms = await getPermissions(userId)
 *     expect(Array.isArray(perms)).toBe(true)
 *     expect(perms).toContain('user:create')
 *   })
 *
 *   it('debería retornar array vacío si sin permisos', async () => {
 *     const perms = await getPermissions(userWithoutPerms)
 *     expect(perms).toEqual([])
 *   })
 * })
 * ```
 *
 * @async
 * @param {string} userId - ID del usuario
 *
 * @returns {Promise<string[]>} Array de IDs de permiso
 *   - Ejemplo: ['user:create', 'user:read', 'role:list']
 *   - Puede estar vacío []
 *   - Sin duplicados
 *
 * @example
 * // Obtener todos los permisos
 * const permissions = await getPermissions(userId)
 * // ['user:create', 'user:read', 'role:list']
 *
 * @example
 * // Usar en client component (después de cargar una vez)
 * const [perms, setPerms] = useState<string[]>([])
 * useEffect(() => {
 *   const loadPerms = async () => {
 *     const p = await getPermissions(userId)
 *     setPerms(p)
 *   }
 *   loadPerms()
 * }, [userId])
 *
 * // Luego en JSX
 * {checkPermission(perms, 'user:create') && <CreateButton />}
 *
 * @see {@link hasPermission} para verificación individual (servidor)
 * @see {@link checkPermission} para verificación individual (cliente)
 * @see {@link checkAnyPermission} para OR (cliente)
 * @see {@link checkAllPermissions} para AND (cliente)
 */
export async function getPermissions(userId: string): Promise<string[]> {
  return await getUserPermissions(userId)
}

// ============================================================================
// HELPERS DE VERIFICACIÓN (CLIENTE)
// ============================================================================

/**
 * Verifica si un permiso está en el array de permisos del usuario
 *
 * **Propósito**: Verificación rápida de permiso en cliente usando array pre-cargado.
 *
 * **Ventajas sobre hasPermission()**:
 * - ✓ Rápido: operación en memoria (O(n))
 * - ✓ Síncrono: no requiere await
 * - ✓ Usable en client components
 * - ✓ Ideal para renderizado UI
 *
 * **Limitaciones**:
 * - ✗ Requiere pre-cargar permisos con getPermissions()
 * - ✗ No refleja cambios en tiempo real (usa cached)
 * - ✗ Puede ser spoofed en cliente (siempre validar en servidor)
 *
 * **Cuándo Usar**:
 * - Renderizar UI condicionalmente (mostrar/ocultar botones)
 * - Client components (no puede usar async)
 * - Optimización para evitar N+1 queries
 * - Después de cargar permisos una vez en session provider
 *
 * **Cuándo NO Usar**:
 * - Proteger server actions (usar hasPermission)
 * - Operaciones sensitivas (validar en servidor)
 * - Cambios de permisos en tiempo real (usar hasPermission)
 *
 * **Patrón de Uso Correcto**:
 * ```typescript
 * // 1. En session provider: cargar ONCE
 * const permissions = await getPermissions(userId)
 * // context.permissions = ['user:create', 'user:read', ...]
 *
 * // 2. En client component: usar check
 * function MyComponent() {
 *   const { permissions } = useContext(AuthContext)
 *   if (checkPermission(permissions, 'user:create')) {
 *     return <CreateButton />
 *   }
 *   return null
 * }
 *
 * // 3. En server action: SIEMPRE verificar con hasPermission
 * async function createUserAction(data) {
 *   const session = await getSession()
 *   if (!await hasPermission(session.userId, 'user:create')) {
 *     throw new Error('Forbidden')
 *   }
 *   // Continuar
 * }
 * ```
 *
 * **Performance**:
 * - O(n) donde n = cantidad de permisos del usuario
 * - Típicamente 10-50 permisos, así que muy rápido
 * - Array.includes() es optimizado en V8
 *
 * **Implementación**:
 * - Usa Array.includes() nativo
 * - Búsqueda lineal (simple pero eficaz)
 * - Para 1000+ permisos, considerar usar Set
 *
 * **Comparación: checkPermission vs hasPermission**:
 * ```
 * checkPermission(perms, 'user:create'):
 * ✓ Rápido (memoria)
 * ✓ Síncrono
 * ✗ Requiere pre-cargar
 * ✗ No es tiempo-real
 * Uso: Renderizado UI
 *
 * hasPermission(userId, 'user:create'):
 * ✓ Seguro (consulta BD)
 * ✓ Tiempo-real
 * ✗ Lento (I/O)
 * ✗ Async
 * Uso: Autorización crítica
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('checkPermission', () => {
 *   it('debe retornar true si permiso existe', () => {
 *     const perms = ['user:create', 'user:read']
 *     const has = checkPermission(perms, 'user:create')
 *     expect(has).toBe(true)
 *   })
 *
 *   it('debe retornar false si permiso no existe', () => {
 *     const perms = ['user:create', 'user:read']
 *     const has = checkPermission(perms, 'admin:delete')
 *     expect(has).toBe(false)
 *   })
 *
 *   it('debe trabajar con array vacío', () => {
 *     const perms: string[] = []
 *     const has = checkPermission(perms, 'user:create')
 *     expect(has).toBe(false)
 *   })
 * })
 * ```
 *
 * @param {string[]} userPermissions - Array de permisos ya cargados
 * @param {string} permission - Permiso a verificar
 *
 * @returns {boolean} true si usuario tiene el permiso, false caso contrario
 *
 * @example
 * // En client component
 * const userPermissions = ['user:create', 'user:read']
 * if (checkPermission(userPermissions, 'user:create')) {
 *   return <CreateUserButton />
 * }
 *
 * @example
 * // Con hook useAuth que carga permisos
 * function CreateButton() {
 *   const { permissions } = useAuth()
 *   if (!checkPermission(permissions, 'user:create')) {
 *     return <DisabledButton />
 *   }
 *   return <ActiveButton />
 * }
 *
 * @see {@link hasPermission} para verificación en servidor (recomendado para autorización)
 * @see {@link getPermissions} para cargar permisos
 * @see {@link checkAnyPermission} para verificación OR
 * @see {@link checkAllPermissions} para verificación AND
 */
export function checkPermission(
  userPermissions: string[],
  permission: string
): boolean {
  return userPermissions.includes(permission)
}

/**
 * Verifica si usuario tiene AL MENOS UNO de los permisos (OR)
 *
 * **Propósito**: Verificación OR en cliente para permisos alternativos.
 *
 * **Lógica**:
 * - Retorna true si ALGUNO de los permisos está en usuario
 * - Retorna false si NINGUNO está
 * - Usa Array.some() (early exit optimizado)
 *
 * **Casos de Uso**:
 * - Mostrar botón si usuario puede hacer A O B
 * - Mostrar formulario si puede crear O actualizar
 * - Acciones alternativas: ver reportes O descargar
 *
 * **Performance**:
 * - Mejor que AND: early exit cuando encuentra uno
 * - O(n) worst case, pero típicamente mucho más rápido
 * - Ejemplo: ['user:create', 'user:delete'] - si tiene 'user:create', retorna inmediatamente
 *
 * **Diferencia vs checkPermission**:
 * ```
 * checkPermission(perms, 'user:create'):
 * - Verifica UN permiso
 * - Equiv: perms.includes('user:create')
 *
 * checkAnyPermission(perms, ['user:create', 'user:delete']):
 * - Verifica SI ALGUNO existe
 * - Equiv: perms.includes('user:create') || perms.includes('user:delete')
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('checkAnyPermission', () => {
 *   it('debe retornar true si tiene al menos uno', () => {
 *     const perms = ['user:create', 'role:read']
 *     const has = checkAnyPermission(perms, ['user:create', 'user:update'])
 *     expect(has).toBe(true)
 *   })
 *
 *   it('debe retornar false si no tiene ninguno', () => {
 *     const perms = ['user:create', 'role:read']
 *     const has = checkAnyPermission(perms, ['user:update', 'admin:delete'])
 *     expect(has).toBe(false)
 *   })
 * })
 * ```
 *
 * @param {string[]} userPermissions - Array de permisos del usuario
 * @param {string[]} permissions - Array de permisos a verificar (al menos uno)
 *
 * @returns {boolean} true si usuario tiene AL MENOS UNO de los permisos
 *
 * @example
 * // Usuario puede ver reportes O descargar
 * const userPermissions = ['user:create', 'report:view']
 * if (checkAnyPermission(userPermissions, ['report:view', 'data:download'])) {
 *   return <ReportTools />
 * }
 *
 * @example
 * // Mostrar botón si puede editar O crear
 * if (checkAnyPermission(permissions, ['user:create', 'user:update'])) {
 *   return <EditButton />
 * }
 *
 * @see {@link hasAnyPermission} para verificación en servidor
 * @see {@link checkPermission} para verificación individual
 * @see {@link checkAllPermissions} para verificación AND (todos)
 */
export function checkAnyPermission(
  userPermissions: string[],
  permissions: string[]
): boolean {
  return permissions.some((p) => userPermissions.includes(p))
}

/**
 * Verifica si usuario tiene TODOS los permisos (AND)
 *
 * **Propósito**: Verificación AND en cliente para permisos requeridos múltiples.
 *
 * **Lógica**:
 * 1. Filtra permisos que usuario NO tiene
 * 2. Si no faltan ninguno → hasPermission: true
 * 3. Si faltan algunos → hasPermission: false + lista en missingPermissions
 *
 * **Retorno: PermissionCheckResult**:
 * ```typescript
 * {
 *   hasPermission: boolean,       // true si tiene TODOS
 *   missingPermissions?: string[] // Array de faltantes (si los hay)
 * }
 * ```
 *
 * **Casos de Uso**:
 * - Crear usuario: necesita crear + actualizar + asignar rol
 * - Operación sensitiva: requiere múltiples permisos
 * - Mostrar formulario complejo con todas las opciones
 *
 * **Performance**:
 * - O(n*m) donde n=requeridos, m=usuario (típicamente <100)
 * - Más lento que checkAnyPermission (verifica todos)
 * - Pero sigue siendo muy rápido en memoria
 *
 * **Diferencia checkAnyPermission vs checkAllPermissions**:
 * ```
 * Requeridos: ['a', 'b', 'c']
 * Usuario tiene: ['a', 'x', 'y']
 *
 * checkAnyPermission → true (tiene 'a')
 * checkAllPermissions:
 *   → hasPermission: false
 *   → missingPermissions: ['b', 'c']
 * ```
 *
 * **Casos de Edge**:
 * ```typescript
 * // Array vacío (debería permitir cualquier cosa)
 * checkAllPermissions(['a', 'b', 'c'], [])
 * // { hasPermission: true }  - no faltan permisos (porque no hay requeridos)
 *
 * // Usuario sin permisos
 * checkAllPermissions([], ['a', 'b'])
 * // { hasPermission: false, missingPermissions: ['a', 'b'] }
 * ```
 *
 * **Testing**:
 * ```typescript
 * describe('checkAllPermissions', () => {
 *   it('debe retornar true si tiene todos', () => {
 *     const result = checkAllPermissions(
 *       ['user:create', 'user:update', 'user:delete'],
 *       ['user:create', 'user:update']
 *     )
 *     expect(result.hasPermission).toBe(true)
 *     expect(result.missingPermissions).toBeUndefined()
 *   })
 *
 *   it('debe retornar false y listar faltantes', () => {
 *     const result = checkAllPermissions(
 *       ['user:create'],
 *       ['user:create', 'user:delete']
 *     )
 *     expect(result.hasPermission).toBe(false)
 *     expect(result.missingPermissions).toEqual(['user:delete'])
 *   })
 * })
 * ```
 *
 * @param {string[]} userPermissions - Array de permisos del usuario
 * @param {string[]} permissions - Array de permisos requeridos (TODOS)
 *
 * @returns {PermissionCheckResult} Resultado con hasPermission y missingPermissions
 *   - hasPermission: true si tiene TODOS, false si faltan
 *   - missingPermissions: array de faltantes (undefined si tiene todos)
 *
 * @example
 * // Usuario debe poder crear, actualizar Y eliminar
 * const result = checkAllPermissions(
 *   permissions,
 *   ['user:create', 'user:update', 'user:delete']
 * )
 * if (result.hasPermission) {
 *   return <FullAccessPanel />
 * } else {
 *   return <LimitedAccessPanel missing={result.missingPermissions} />
 * }
 *
 * @example
 * // Mostrar error detallado
 * const result = checkAllPermissions(permissions, ['admin:delete', 'audit:view'])
 * if (!result.hasPermission) {
 *   console.warn(
 *     `Missing permissions: ${result.missingPermissions?.join(', ')}`
 *   )
 * }
 *
 * @see {@link hasAllPermissions} para verificación en servidor
 * @see {@link checkPermission} para verificación individual
 * @see {@link checkAnyPermission} para verificación OR (al menos uno)
 */
export function checkAllPermissions(
  userPermissions: string[],
  permissions: string[]
): PermissionCheckResult {
  const missingPermissions = permissions.filter(
    (p) => !userPermissions.includes(p)
  )

  return {
    hasPermission: missingPermissions.length === 0,
    missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined,
  }
}
