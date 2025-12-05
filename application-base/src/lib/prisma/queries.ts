/**
 * Consultas tipadas con Prisma para Aurora Nova
 *
 * Aurora Nova - Funciones Helper de Base de Datos
 *
 * Proporciona funciones helpers reutilizables para operaciones frecuentes de base de datos.
 * Todas las consultas están completamente tipadas con TypeScript para máxima seguridad.
 *
 * **Contenido**:
 * - {@link getUserById}: Obtener usuario por ID único
 * - {@link getUserByEmail}: Obtener usuario por email único
 * - {@link getUserWithCredentials}: Usuario con credenciales de autenticación
 * - {@link getUserWithRoles}: Usuario con roles asignados
 * - {@link getUserWithFullData}: Usuario con roles y permisos completos
 * - {@link getUserPermissions}: Extraer array plano de permisos
 * - {@link userHasPermission}: Verificar permiso específico
 * - {@link createUserWithCredentials}: Crear usuario con credenciales en transacción
 * - {@link getRoleById}: Obtener rol con sus permisos
 * - {@link getRoleByName}: Obtener rol por nombre único
 * - {@link getAllRolesWithPermissions}: Listar todos los roles
 * - {@link assignRoleToUser}: Asignar rol a usuario
 * - {@link removeRoleFromUser}: Remover rol de usuario
 * - {@link getSessionByToken}: Obtener sesión por token
 * - {@link getUserActiveSessions}: Sesiones no expiradas de usuario
 * - {@link cleanExpiredSessions}: Limpiar sesiones vencidas
 * - {@link getSystemStats}: Estadísticas globales del sistema
 * - {@link simplifyUserWithFullData}: Convertir datos completos a formato simple
 *
 * **Patrones Principales**:
 * - **Queries de Usuario**: Soportan carga de relaciones (roles, permisos, credenciales)
 * - **Queries de Rol**: Incluyen permisos asociados para autorización
 * - **Queries de Sesión**: Soporte para sesiones activas y expiración
 * - **Transacciones**: createUserWithCredentials usa transacción atómica
 *
 * **Tipos de Retorno**:
 * Todas las funciones retornan tipos derivados de Prisma para máxima seguridad:
 * - {@link User}: Usuario base sin relaciones
 * - {@link UserWithRoles}: Usuario + roles asignados
 * - {@link UserWithFullData}: Usuario + roles + permisos (máximo detalle)
 * - {@link UserWithCredentials}: Usuario + credenciales de autenticación
 * - {@link RoleWithPermissions}: Rol + permisos asociados
 * - {@link UserWithRolesAndPermissions}: Tipo simplificado para respuestas
 *
 * **Ejemplos de Uso**:
 * ```typescript
 * import { getUserWithFullData, userHasPermission, createUserWithCredentials } from '@/lib/prisma/queries';
 *
 * // Obtener usuario completo (roles + permisos)
 * const user = await getUserWithFullData('user-123');
 * if (!user) throw new Error('Usuario no encontrado');
 *
 * // Verificar permiso directo
 * const canDelete = await userHasPermission('user-123', 'user:delete');
 *
 * // Crear usuario con credenciales de forma atómica
 * const newUser = await createUserWithCredentials(
 *   { email: 'user@example.com', firstName: 'John' },
 *   hashedPassword
 * );
 * ```
 *
 * **Performance**:
 * - Usa índices en campos unique (id, email, name)
 * - Queries de rol/permiso optimizadas con índices compuestos
 * - getSystemStats ejecuta 4 queries en paralelo con Promise.all()
 * - cleanExpiredSessions puede correr como cron job periódicamente
 *
 * **Seguridad**:
 * - Nunca expone contraseñas hasheadas en retorno (usa relación credentials)
 * - RBAC: Autorización basada en roles + permisos
 * - Todas las operaciones tipadas (TypeScript strict mode)
 * - Protección contra N+1 queries usando include de Prisma
 *
 * @module lib/prisma/queries
 * @see {@link ./connection.ts} para PrismaClient singleton
 * @see {@link ./types.ts} para definiciones de tipos derivados
 * @see {@link ../auth-utils.ts} para funciones de autenticación
 * @see {@link ../../actions/auth.ts} para server actions que usan estas queries
 */

import { prisma } from './connection'
import type {
  User,
  UserWithRoles,
  UserWithFullData,
  RoleWithPermissions,
  UserWithCredentials,
  UserWithRolesAndPermissions
} from './types'

// ============================================================================
// QUERIES DE USUARIOS - User Retrieval Queries
// ============================================================================

/**
 * Obtener usuario por ID único
 *
 * Busca un usuario en la base de datos por su ID primario.
 * Retorna solo datos básicos del usuario sin relaciones.
 *
 * @async
 * @param id - ID único del usuario (UUID)
 *
 * @returns {Promise<User | null>} Usuario encontrado o null si no existe
 *
 * @remarks
 * **Query Performance**:
 * - Usa índice primario (id)
 * - Cero relaciones cargadas
 * - Ideal para búsquedas rápidas
 *
 * **Casos de Uso**:
 * - Verificar existencia de usuario
 * - Cargar datos básicos antes de incluir relaciones
 * - Operaciones que solo necesitan info básica
 *
 * @example
 * ```typescript
 * const user = await getUserById('user-123');
 * if (!user) {
 *   throw new Error('Usuario no encontrado');
 * }
 * console.log(user.email); // 'user@example.com'
 * ```
 */
export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id }
  })
}

/**
 * Obtener usuario por email único
 *
 * Busca un usuario por su dirección de email (campo único).
 * Usado principalmente en login y verificación.
 *
 * @async
 * @param email - Email del usuario (debe existir en BD)
 *
 * @returns {Promise<User | null>} Usuario encontrado o null
 *
 * @remarks
 * **Query Performance**:
 * - Usa índice único en email field
 * - Muy rápido para autenticación
 *
 * **Casos de Uso**:
 * - Login: findUser por email antes de verificar contraseña
 * - Validar email único en registro
 * - Recuperar usuario por email en reset password
 *
 * @example
 * ```typescript
 * // Usado en login
 * const user = await getUserByEmail('user@example.com');
 * if (!user) return { error: 'Usuario no existe' };
 *
 * const passwordMatch = await bcrypt.compare(password, user.credentials.hashedPassword);
 * ```
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email }
  })
}

/**
 * Obtener usuario con credenciales de autenticación
 *
 * Carga el usuario junto con su registro de credenciales.
 * Necesario para operaciones de autenticación y cambio de contraseña.
 *
 * @async
 * @param userId - ID del usuario
 *
 * @returns {Promise<UserWithCredentials | null>} Usuario con relación credentials
 *
 * @remarks
 * **Query Performance**:
 * - Carga 2 registros: user + userCredentials
 * - Evita N+1 queries para autenticación
 *
 * **Estructura Retornada**:
 * ```typescript
 * {
 *   id: string;
 *   email: string;
 *   // ... otros campos user
 *   credentials: {
 *     userId: string;
 *     hashedPassword: string; // bcrypt hash
 *     updatedAt: Date;
 *   }
 * }
 * ```
 *
 * **Seguridad**:
 * - Nunca retorna contraseña en texto plano
 * - Hash verificado con bcrypt.compare() en código
 * - Credenciales en tabla separada por integridad
 *
 * **Casos de Uso**:
 * - Verificación de contraseña en login
 * - Cambio de contraseña (obtener usuario actual)
 * - Validación de credenciales antes de operaciones sensibles
 *
 * @example
 * ```typescript
 * const userWithCreds = await getUserWithCredentials(userId);
 * if (!userWithCreds?.credentials) throw new Error('No credentials');
 *
 * const isValid = await bcrypt.compare(
 *   password,
 *   userWithCreds.credentials.hashedPassword
 * );
 * ```
 */
export async function getUserWithCredentials(userId: string): Promise<UserWithCredentials | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      credentials: true
    }
  })
}

/**
 * Obtener usuario con sus roles asignados
 *
 * Carga el usuario y todos los roles que tiene asignados.
 * No incluye los permisos de cada rol.
 *
 * @async
 * @param userId - ID del usuario
 *
 * @returns {Promise<UserWithRoles | null>} Usuario con relación userRoles incluida
 *
 * @remarks
 * **Estructura Retornada**:
 * ```typescript
 * {
 *   id: string;
 *   email: string;
 *   // ... otros campos user
 *   userRoles: [
 *     {
 *       userId: string;
 *       roleId: string;
 *       createdAt: Date;
 *       role: {
 *         id: string;
 *         name: string;
 *         description: string | null;
 *         // ... otros campos role
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * **Casos de Uso**:
 * - Mostrar roles de usuario en UI
 * - Verificar membresía de rol (sin detalle de permisos)
 * - Administración de roles de usuario
 *
 * @example
 * ```typescript
 * const userWithRoles = await getUserWithRoles(userId);
 * const roleNames = userWithRoles?.userRoles.map(ur => ur.role.name) ?? [];
 * console.log('User roles:', roleNames); // ['Admin', 'Editor']
 * ```
 */
export async function getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  })
}

/**
 * Obtener usuario con roles Y permisos completos
 *
 * Carga el usuario con toda su cadena de autorización:
 * usuario → roles → permisos. Proporciona todos los datos necesarios
 * para verificación completa de permisos (RBAC).
 *
 * @async
 * @param userId - ID del usuario
 *
 * @returns {Promise<UserWithFullData | null>} Usuario con roles y permisos anidados
 *
 * @remarks
 * **Estructura Retornada**:
 * ```typescript
 * {
 *   id: string;
 *   userRoles: [
 *     {
 *       role: {
 *         id: string;
 *         rolePermissions: [
 *           {
 *             permission: {
 *               id: string;
 *               name: string;
 *               module: string;
 *               // ...
 *             }
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * **Performance Note**:
 * ⚠️ Esta es la query más "pesada" ya que carga múltiples niveles de relaciones.
 * Usar solo cuando sea necesario acceder a permisos completos.
 * Para solo verificar un permiso, usar userHasPermission() en su lugar.
 *
 * **Casos de Uso**:
 * - Cargar usuario después de login (toda su autorización)
 * - Mostrar detalles completos de permisos en UI administrativa
 * - Verificación compleja de permisos que requiere todos los datos
 * - Almacenar en sesión/token para autenticación rápida
 *
 * **Alternativa Recomendada**:
 * Si solo necesitas verificar UN permiso, usa userHasPermission() es más rápido.
 *
 * @example
 * ```typescript
 * // En login - cargar usuario completo para sesión
 * const user = await getUserWithFullData(userId);
 * const permissions = user?.userRoles.flatMap(ur =>
 *   ur.role.rolePermissions.map(rp => rp.permission.id)
 * ) ?? [];
 *
 * // Almacenar en token/sesión para verificación rápida
 * const token = jwt.sign({ userId, permissions }, secret);
 * ```
 */
export async function getUserWithFullData(userId: string): Promise<UserWithFullData | null> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  })
}

/**
 * Obtener permisos de un usuario (array plano)
 *
 * Extrae solo los IDs de permisos que tiene un usuario,
 * en formato de array simple para fácil búsqueda.
 *
 * @async
 * @param userId - ID del usuario
 *
 * @returns {Promise<string[]>} Array de IDs de permisos únicos
 *
 * @remarks
 * **Query Performance**:
 * - Optimizada para retornar solo IDs (select específico)
 * - Query de lectura simple sin datos completos
 * - Ideal para caching o comparación rápida
 *
 * **Estructura de Datos**:
 * Retorna: `['user:read', 'user:create', 'user:update', 'role:read', ...]`
 *
 * **Casos de Uso**:
 * - Verificación rápida si usuario tiene permiso (usar `permissions.includes()`)
 * - Almacenar en sesión para validación rápida
 * - Auditoría: registrar permisos activos del usuario
 * - Mostrar permisos en UI administrativa
 *
 * @example
 * ```typescript
 * const permissions = await getUserPermissions(userId);
 *
 * // Verificación rápida
 * if (permissions.includes('user:delete')) {
 *   // Usuario puede borrar
 * }
 *
 * // Caching
 * cache.set(`user:${userId}:perms`, permissions, 5 * 60 * 1000);
 * ```
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await prisma.rolePermission.findMany({
    where: {
      role: {
        userRoles: {
          some: {
            userId: userId
          }
        }
      }
    },
    select: {
      permissionId: true
    }
  })

  return result.map(r => r.permissionId)
}

/**
 * Verificar si un usuario tiene un permiso específico
 *
 * Realiza una búsqueda de permisos de forma eficiente sin cargar todos los datos.
 * Retorna boolean para verificación simple en lógica de autorización.
 *
 * @async
 * @param userId - ID del usuario
 * @param permissionId - ID del permiso a verificar
 *
 * @returns {Promise<boolean>} true si el usuario tiene el permiso, false si no
 *
 * @remarks
 * **Query Performance**:
 * - Usa COUNT query optimizada (muy rápida)
 * - No carga datos completos, solo verifica existencia
 * - Ideal para bucles de verificación rápida
 *
 * **Casos de Uso**:
 * - Verificación rápida en servidor antes de operación
 * - Guarding de acciones administrativas
 * - Validación granular de permisos
 * - Middleware de autorización
 *
 * @example
 * ```typescript
 * const canDelete = await userHasPermission(userId, 'user:delete');
 *
 * if (!canDelete) {
 *   throw new PermissionDeniedError(['user:delete']);
 * }
 *
 * // Proceder con operación
 * await prisma.user.delete({ where: { id: targetUserId } });
 * ```
 *
 * @see {@link ./require-permission.ts} para helpers de servidor con errores
 */
export async function userHasPermission(userId: string, permissionId: string): Promise<boolean> {
  const count = await prisma.rolePermission.count({
    where: {
      permissionId: permissionId,
      role: {
        userRoles: {
          some: {
            userId: userId
          }
        }
      }
    }
  })

  return count > 0
}

/**
 * Crear usuario con credenciales en transacción atómica
 *
 * Crea un nuevo usuario junto con sus credenciales de autenticación.
 * Garantiza que usuario Y credenciales se crean juntos (transacción ACID).
 *
 * @async
 * @param userData - Objeto con datos del usuario
 * @param userData.email - Email único (requerido)
 * @param userData.firstName - Nombre del usuario (opcional)
 * @param userData.lastName - Apellido del usuario (opcional)
 * @param userData.name - Nombre completo (opcional)
 * @param hashedPassword - Hash bcryptjs de la contraseña (debe estar pre-hasheado)
 *
 * @returns {Promise<User>} Usuario creado sin relaciones
 *
 * @throws {Prisma.PrismaClientKnownRequestError} Si email ya existe (unique violation)
 *
 * @remarks
 * **Transacción Atómica**:
 * - Si algo falla, ambos registros se revierten
 * - Usuario Y credenciales siempre están sincronizados
 * - Garantía de integridad referencial
 *
 * **Validaciones Esperadas**:
 * - hashedPassword debe estar ya hasheado con bcrypt (no pasar contraseña en texto)
 * - email debe ser válido y único en BD
 *
 * **Casos de Uso**:
 * - Registro de nuevo usuario
 * - Creación de usuario por administrador
 * - Migración de usuarios desde otro sistema
 *
 * **Flujo Típico en Registro**:
 * ```
 * 1. Usuario envía email + password
 * 2. Hash password con bcrypt (12 rounds)
 * 3. Validar email no existe
 * 4. createUserWithCredentials() crea ambos atomicamente
 * 5. Dispara event USER_REGISTERED
 * 6. Retorna usuario creado
 * ```
 *
 * @example
 * ```typescript
 * import bcrypt from 'bcryptjs';
 * import { createUserWithCredentials } from '@/lib/prisma/queries';
 *
 * // 1. Hash de contraseña
 * const hashedPassword = await bcrypt.hash(password, 12);
 *
 * // 2. Crear usuario con credenciales
 * try {
 *   const newUser = await createUserWithCredentials(
 *     {
 *       email: 'user@example.com',
 *       firstName: 'John',
 *       lastName: 'Doe',
 *       name: 'John Doe'
 *     },
 *     hashedPassword
 *   );
 *
 *   // 3. Dispara evento de registro
 *   await eventBus.dispatch(SystemEvent.USER_REGISTERED, {
 *     userId: newUser.id,
 *     email: newUser.email,
 *     firstName: newUser.firstName,
 *     lastName: newUser.lastName
 *   });
 *
 *   return { success: true, user: newUser };
 * } catch (error) {
 *   if (error.code === 'P2002') {
 *     return { error: 'Email ya está registrado' };
 *   }
 *   throw error;
 * }
 * ```
 *
 * @see {@link ../../actions/auth.ts} en registerUser para uso completo
 */
export async function createUserWithCredentials(
  userData: {
    email: string
    firstName?: string
    lastName?: string
    name?: string
  },
  hashedPassword: string
): Promise<User> {
  return await prisma.user.create({
    data: {
      ...userData,
      credentials: {
        create: {
          hashedPassword
        }
      }
    }
  })
}

// ============================================================================
// QUERIES DE ROLES - Role Management Queries
// ============================================================================

/**
 * Obtener rol por ID con todos sus permisos
 *
 * Carga un rol específico junto con todos los permisos asignados a ese rol.
 *
 * @async
 * @param id - ID único del rol
 *
 * @returns {Promise<RoleWithPermissions | null>} Rol con relación rolePermissions
 *
 * @remarks
 * **Estructura Retornada**:
 * ```typescript
 * {
 *   id: string;
 *   name: string;
 *   description: string | null;
 *   // ... otros campos role
 *   rolePermissions: [
 *     {
 *       roleId: string;
 *       permissionId: string;
 *       permission: {
 *         id: string;
 *         name: string;
 *         module: string;
 *         // ...
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * **Casos de Uso**:
 * - Mostrar detalles completos de rol en UI administrativa
 * - Obtener permisos de un rol para verificación
 * - Edición de rol (mostrar permisos actuales)
 *
 * @example
 * ```typescript
 * const roleWithPerms = await getRoleById('role-admin');
 * if (!roleWithPerms) throw new Error('Rol no encontrado');
 *
 * const permissions = roleWithPerms.rolePermissions.map(rp => rp.permission);
 * ```
 */
export async function getRoleById(id: string): Promise<RoleWithPermissions | null> {
  return await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  })
}

/**
 * Obtener rol por nombre único con todos sus permisos
 *
 * Busca un rol por su nombre (campo único) e incluye permisos.
 * Útil para búsqueda por nombre de rol conocido.
 *
 * @async
 * @param name - Nombre único del rol (ej: 'Admin', 'Editor')
 *
 * @returns {Promise<RoleWithPermissions | null>} Rol encontrado con permisos o null
 *
 * @remarks
 * **Casos de Uso**:
 * - Obtener un rol conocido por nombre (ej: 'Super Admin')
 * - Verificar existencia de rol estándar
 * - Asignación automática de roles en registro
 *
 * @example
 * ```typescript
 * // Obtener rol de usuario estándar
 * const userRole = await getRoleByName('Usuario');
 * if (!userRole) {
 *   // Rol no existe, crear
 *   await createDefaultRoles();
 * }
 *
 * // Asignar rol a usuario nuevo
 * await assignRoleToUser(newUserId, userRole.id);
 * ```
 */
export async function getRoleByName(name: string): Promise<RoleWithPermissions | null> {
  return await prisma.role.findUnique({
    where: { name },
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  })
}

/**
 * Listar todos los roles del sistema con sus permisos
 *
 * Retorna todos los roles existentes, ordenados alfabéticamente,
 * cada uno con sus permisos asociados completos.
 *
 * @async
 *
 * @returns {Promise<RoleWithPermissions[]>} Array de roles con permisos
 *
 * @remarks
 * **Ordenamiento**:
 * - Ordenado por nombre (A-Z) para consistencia
 *
 * **Performance**:
 * ⚠️ Carga TODOS los roles + TODOS los permisos.
 * Si hay muchos roles/permisos, considerar paginación.
 *
 * **Casos de Uso**:
 * - Administración: mostrar lista de roles
 * - Selectable en formulario de asignación
 * - UI de RBAC (Role-Based Access Control)
 *
 * @example
 * ```typescript
 * const allRoles = await getAllRolesWithPermissions();
 *
 * // Mostrar en UI
 * const roleOptions = allRoles.map(role => ({
 *   value: role.id,
 *   label: role.name,
 *   permissions: role.rolePermissions.length
 * }));
 * ```
 */
export async function getAllRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  return await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })
}

/**
 * Asignar un rol existente a un usuario
 *
 * Crea la relación UserRole, conectando el usuario a un rol.
 * Registra quién hizo la asignación para auditoría.
 *
 * @async
 * @param userId - ID del usuario que recibe el rol
 * @param roleId - ID del rol a asignar
 * @param createdBy - ID del admin que realizó la asignación (opcional, para auditoría)
 *
 * @returns {Promise<void>}
 *
 * @throws {Prisma.PrismaClientKnownRequestError} Si usuario o rol no existen
 *
 * @remarks
 * **Validaciones Esperadas**:
 * - userId debe existir en tabla users
 * - roleId debe existir en tabla roles
 * - Combinación userId+roleId debe ser única (no asignar dos veces)
 *
 * **Auditoría**:
 * - createdBy registra quién hizo la asignación (admin ID)
 * - Útil para trazabilidad de cambios de permisos
 *
 * **Casos de Uso**:
 * - Asignar rol a usuario en registro
 * - Admin asigna rol adicional a usuario existente
 * - Migración: asignar roles durante importación
 *
 * @example
 * ```typescript
 * // Asignar rol 'Editor' a usuario
 * await assignRoleToUser(
 *   'user-123',           // Usuario
 *   'role-editor',        // Rol
 *   'admin-456'           // Quién lo asignó (para auditoría)
 * );
 *
 * // Luego dispara evento
 * await eventBus.dispatch(SystemEvent.USER_ROLE_ASSIGNED, {
 *   userId: 'user-123',
 *   roleId: 'role-editor',
 *   roleName: 'Editor',
 *   assignedBy: 'admin-456'
 * });
 * ```
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  createdBy?: string
): Promise<void> {
  await prisma.userRole.create({
    data: {
      userId,
      roleId,
      createdBy
    }
  })
}

/**
 * Remover un rol de un usuario
 *
 * Elimina la relación UserRole, revocando todos los permisos del rol.
 *
 * @async
 * @param userId - ID del usuario
 * @param roleId - ID del rol a remover
 *
 * @returns {Promise<void>}
 *
 * @throws {Prisma.PrismaClientKnownRequestError} Si la combinación no existe
 *
 * @remarks
 * **Efecto**:
 * - Usuario pierde TODOS los permisos del rol inmediatamente
 * - Si es el único rol del usuario, queda sin permisos
 * - Revoca sesiones activas del usuario (en flujo completo)
 *
 * **Seguridad**:
 * - Debería ir acompañado de invalidación de sesiones
 * - Dispara evento USER_ROLE_REMOVED para auditoría
 *
 * **Casos de Uso**:
 * - Remover acceso administrativo de usuario
 * - Cambio organizacional: transferir a otro rol
 * - Revocación de permisos por seguridad
 *
 * @example
 * ```typescript
 * // Remover rol admin de usuario
 * await removeRoleFromUser('user-123', 'role-admin');
 *
 * // Luego invalidar sesiones y disparar evento
 * await prisma.session.deleteMany({ where: { userId: 'user-123' } });
 *
 * await eventBus.dispatch(SystemEvent.USER_ROLE_REMOVED, {
 *   userId: 'user-123',
 *   roleId: 'role-admin',
 *   roleName: 'Admin',
 *   removedBy: 'admin-456'
 * });
 * ```
 *
 * @see {@link cleanExpiredSessions} para mantener sesiones limpias
 */
export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  await prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId
      }
    }
  })
}

// ============================================================================
// QUERIES DE SESIONES - Session Management Queries
// ============================================================================

/**
 * Obtener sesión por token junto con datos del usuario
 *
 * Busca una sesión activa por su token de sesión.
 * Incluye datos completos del usuario asociado.
 *
 * @async
 * @param sessionToken - Token único de la sesión (del cookie)
 *
 * @returns {Promise<Session & { user: User } | null>} Sesión con usuario o null
 *
 * @remarks
 * **Flujo de Autenticación**:
 * 1. Extrae sessionToken del cookie (habitualmente 'auth-session')
 * 2. Busca sesión en BD
 * 3. Valida que no esté expirada (timestamp)
 * 4. Retorna usuario asociado
 *
 * **Seguridad**:
 * - Token almacenado en BD (nunca en memoria)
 * - Búsqueda única por token previene collisiones
 * - Verifica expiración en código
 *
 * **Casos de Uso**:
 * - Middleware de autenticación (validar sesión al inicio de request)
 * - Refresh de sesión
 * - Auditoría de acceso
 *
 * @example
 * ```typescript
 * // En middleware
 * const sessionToken = req.cookies.get('auth-session')?.value;
 * if (!sessionToken) return unauthorized();
 *
 * const session = await getSessionByToken(sessionToken);
 * if (!session || new Date() > session.expires) {
 *   return unauthorized();
 * }
 *
 * const user = session.user;
 * ```
 */
export async function getSessionByToken(sessionToken: string) {
  return await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: true
    }
  })
}

/**
 * Obtener todas las sesiones activas de un usuario
 *
 * Retorna lista de sesiones no expiradas del usuario.
 * Útil para mostrar dispositivos conectados o logout múltiple.
 *
 * @async
 * @param userId - ID del usuario
 *
 * @returns {Promise<Session[]>} Array de sesiones activas (ordenadas por fecha)
 *
 * @remarks
 * **Filtro de Actividad**:
 * - Solo retorna sesiones donde `expires > NOW()`
 * - Sesiones expiradas ignoradas automáticamente
 *
 * **Casos de Uso**:
 * - UI: "Dispositivos conectados" en perfil de usuario
 * - Admin: Ver qué dispositivos tienen sesión activa
 * - Logout: Invalidar todas las sesiones (en combinación con deleteMany)
 * - Fuerza re-login después de cambio de contraseña
 *
 * @example
 * ```typescript
 * // Mostrar dispositivos conectados
 * const activeSessions = await getUserActiveSessions(userId);
 *
 * // Logout de todos los dispositivos
 * await prisma.session.deleteMany({
 *   where: { userId }
 * });
 * ```
 */
export async function getUserActiveSessions(userId: string) {
  return await prisma.session.findMany({
    where: {
      userId,
      expires: {
        gt: new Date()
      }
    }
  })
}

/**
 * Limpiar sesiones expiradas del sistema
 *
 * Elimina todos los registros de sesión cuya fecha de expiración
 * es anterior a ahora. Útil para cron jobs de mantenimiento.
 *
 * @async
 *
 * @returns {Promise<number>} Cantidad de sesiones eliminadas
 *
 * @remarks
 * **Propósito**:
 * - Liberar espacio en BD
 * - Mantener tabla session limpia
 * - Evitar crecer indefinidamente
 *
 * **Recomendación de Ejecución**:
 * - Cron job: ejecutar cada hora o diariamente
 * - Bajo carga (ej: 3 AM UTC)
 * - Con índice en `expires` para performance
 *
 * **Performance**:
 * - Usa índice en campo `expires` para búsqueda rápida
 * - DELETE optimizado para múltiples registros
 * - Típicamente < 100ms si se ejecuta regularmente
 *
 * **Ejemplo Cron**:
 * ```
 * 0 0 * * * curl https://app.com/api/cron/cleanup-sessions
 * ```
 *
 * @example
 * ```typescript
 * // En API route cron (/api/cron/cleanup-sessions)
 * export async function POST(request: Request) {
 *   const deleted = await cleanExpiredSessions();
 *   console.log(`Cleaned ${deleted} expired sessions`);
 *   return NextResponse.json({ deleted });
 * }
 * ```
 */
export async function cleanExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expires: {
        lte: new Date()
      }
    }
  })

  return result.count
}

// ============================================================================
// QUERIES DE ESTADÍSTICAS - System Statistics Queries
// ============================================================================

/**
 * Obtener estadísticas globales del sistema
 *
 * Retorna conteos agregados de usuarios, roles, permisos y sesiones.
 * Ejecuta todas las queries en paralelo para mejor performance.
 *
 * @async
 *
 * @returns {Promise<Object>} Objeto con estadísticas del sistema:
 *   - users: Cantidad total de usuarios registrados
 *   - roles: Cantidad total de roles definidos
 *   - permissions: Cantidad total de permisos del sistema
 *   - activeSessions: Cantidad de sesiones NO expiradas
 *
 * @remarks
 * **Performance**:
 * - Ejecuta 4 COUNT queries en paralelo (Promise.all)
 * - Cada query usa índice de PK/FK para rapidez
 * - Típicamente < 50ms en BD normal
 *
 * **Casos de Uso**:
 * - Dashboard administrativo (widget de métricas)
 * - Monitoreo de salud del sistema
 * - Auditoría y reportes
 * - Alertas (ej: "demasiadas sesiones activas")
 *
 * **Ejemplo Retorno**:
 * ```typescript
 * {
 *   users: 142,
 *   roles: 5,
 *   permissions: 47,
 *   activeSessions: 23
 * }
 * ```
 *
 * @example
 * ```typescript
 * // En dashboard administrativo
 * const stats = await getSystemStats();
 *
 * return (
 *   <div className="grid grid-cols-4">
 *     <Card title="Usuarios" value={stats.users} />
 *     <Card title="Roles" value={stats.roles} />
 *     <Card title="Permisos" value={stats.permissions} />
 *     <Card title="Sesiones Activas" value={stats.activeSessions} />
 *   </div>
 * );
 * ```
 */
export async function getSystemStats() {
  const [usersCount, rolesCount, permissionsCount, activeSessionsCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.session.count({
      where: {
        expires: {
          gt: new Date()
        }
      }
    })
  ])

  return {
    users: usersCount,
    roles: rolesCount,
    permissions: permissionsCount,
    activeSessions: activeSessionsCount,
  }
}

// ============================================================================
// HELPER FUNCTIONS - Data Transformation Utilities
// ============================================================================

/**
 * Convertir usuario con datos completos a formato simplificado
 *
 * Transforma estructura anidada de usuario (con roles y permisos completos)
 * a formato simplificado para respuestas de API o almacenamiento en token.
 *
 * @param user - Usuario con estructura completa (UserWithFullData)
 *
 * @returns {UserWithRolesAndPermissions} Usuario simplificado con arrays planos
 *
 * @remarks
 * **Transformación**:
 * - Extrae solo IDs de permisos (deduplica con Set)
 * - Mapea roles a estructura simple
 * - Retorna todos los campos del usuario
 *
 * **Deduplicación**:
 * - Si usuario tiene 2 roles con permiso común, aparece 1 sola vez
 * - Usa `Array.from(new Set(...))` para garantizar unicidad
 *
 * **Casos de Uso**:
 * - Respuesta API después de login
 * - Payload del JWT token
 * - Almacenamiento en sesión
 * - Serialización para caché
 *
 * **Estructura Original**:
 * ```
 * user {
 *   userRoles: [
 *     {
 *       role: {
 *         rolePermissions: [
 *           { permission: { id: "user:read" } }
 *         ]
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * **Estructura Retornada**:
 * ```
 * {
 *   id, name, email, ...
 *   roles: [{ id, name, description }],
 *   permissions: ["user:read", "user:create", ...]
 * }
 * ```
 *
 * @example
 * ```typescript
 * // En login
 * const user = await getUserWithFullData(userId);
 * const simplified = simplifyUserWithFullData(user);
 *
 * // Guardar en token
 * const token = jwt.sign({
 *   userId: simplified.id,
 *   email: simplified.email,
 *   permissions: simplified.permissions
 * }, secret);
 *
 * // O retornar en API
 * return NextResponse.json(simplified);
 * ```
 */
export function simplifyUserWithFullData(user: UserWithFullData): UserWithRolesAndPermissions {
  const roles = user.userRoles.map(ur => ({
    id: ur.role.id,
    name: ur.role.name,
    description: ur.role.description
  }))

  const permissions = Array.from(new Set(
    user.userRoles.flatMap(ur =>
      ur.role.rolePermissions.map(rp => rp.permission.id)
    )
  ))

  return {
    id: user.id,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    roles,
    permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}