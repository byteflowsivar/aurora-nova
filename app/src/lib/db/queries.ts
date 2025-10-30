/**
 * Queries tipadas comunes para Aurora Nova
 * Funciones helper para operaciones frecuentes de base de datos
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from './connection';
import {
  userTable,
  sessionTable,
  roleTable,
  permissionTable,
  userRoleTable,
  rolePermissionTable,
  type User,
  type UserWithRoles,
  type RoleWithPermissions,
  type UserWithFullData,
} from './schema';

// ============================================================================
// QUERIES DE USUARIOS
// ============================================================================

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
  return result[0];
}

/**
 * Obtener usuario por email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  return result[0];
}

/**
 * Obtener usuario con sus roles
 */
export async function getUserWithRoles(userId: string): Promise<UserWithRoles | undefined> {
  const result = await db
    .select()
    .from(userTable)
    .leftJoin(userRoleTable, eq(userTable.id, userRoleTable.userId))
    .leftJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .where(eq(userTable.id, userId));

  if (result.length === 0) return undefined;

  const user = result[0].user;
  const userRoles = result
    .filter(r => r.user_role && r.role)
    .map(r => ({
      ...r.user_role!,
      role: r.role!,
    }));

  return { ...user, userRoles };
}

/**
 * Obtener usuario con roles y permisos completos
 */
export async function getUserWithFullData(userId: string): Promise<UserWithFullData | undefined> {
  const result = await db
    .select()
    .from(userTable)
    .leftJoin(userRoleTable, eq(userTable.id, userRoleTable.userId))
    .leftJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .leftJoin(rolePermissionTable, eq(roleTable.id, rolePermissionTable.roleId))
    .leftJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
    .where(eq(userTable.id, userId));

  if (result.length === 0) return undefined;

  const user = result[0].user;

  // Agrupar roles y permisos
  const rolesMap = new Map<string, UserWithFullData['userRoles'][0]>();

  for (const row of result) {
    if (row.role && row.user_role) {
      if (!rolesMap.has(row.role.id)) {
        rolesMap.set(row.role.id, {
          ...row.user_role,
          role: {
            ...row.role,
            rolePermissions: [],
          },
        });
      }

      if (row.permission && row.role_permission) {
        rolesMap.get(row.role.id)!.role.rolePermissions.push({
          ...row.role_permission,
          permission: row.permission,
        });
      }
    }
  }

  return {
    ...user,
    userRoles: Array.from(rolesMap.values()),
  };
}

/**
 * Obtener permisos de un usuario (array plano)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const result = await db
    .select({ permissionId: permissionTable.id })
    .from(userTable)
    .innerJoin(userRoleTable, eq(userTable.id, userRoleTable.userId))
    .innerJoin(rolePermissionTable, eq(userRoleTable.roleId, rolePermissionTable.roleId))
    .innerJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
    .where(eq(userTable.id, userId));

  return result.map(r => r.permissionId);
}

/**
 * Verificar si un usuario tiene un permiso específico
 */
export async function userHasPermission(userId: string, permissionId: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userTable)
    .innerJoin(userRoleTable, eq(userTable.id, userRoleTable.userId))
    .innerJoin(rolePermissionTable, eq(userRoleTable.roleId, rolePermissionTable.roleId))
    .where(
      and(
        eq(userTable.id, userId),
        eq(rolePermissionTable.permissionId, permissionId)
      )
    );

  return Number(result[0].count) > 0;
}

// ============================================================================
// QUERIES DE ROLES
// ============================================================================

/**
 * Obtener rol por ID
 */
export async function getRoleById(id: string): Promise<RoleWithPermissions | undefined> {
  const result = await db
    .select()
    .from(roleTable)
    .leftJoin(rolePermissionTable, eq(roleTable.id, rolePermissionTable.roleId))
    .leftJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
    .where(eq(roleTable.id, id));

  if (result.length === 0) return undefined;

  const role = result[0].role;
  const rolePermissions = result
    .filter(r => r.role_permission && r.permission)
    .map(r => ({
      ...r.role_permission!,
      permission: r.permission!,
    }));

  return { ...role, rolePermissions };
}

/**
 * Obtener rol por nombre
 */
export async function getRoleByName(name: string): Promise<RoleWithPermissions | undefined> {
  const result = await db
    .select()
    .from(roleTable)
    .leftJoin(rolePermissionTable, eq(roleTable.id, rolePermissionTable.roleId))
    .leftJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
    .where(eq(roleTable.name, name));

  if (result.length === 0) return undefined;

  const role = result[0].role;
  const rolePermissions = result
    .filter(r => r.role_permission && r.permission)
    .map(r => ({
      ...r.role_permission!,
      permission: r.permission!,
    }));

  return { ...role, rolePermissions };
}

/**
 * Listar todos los roles con sus permisos
 */
export async function getAllRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const result = await db
    .select()
    .from(roleTable)
    .leftJoin(rolePermissionTable, eq(roleTable.id, rolePermissionTable.roleId))
    .leftJoin(permissionTable, eq(rolePermissionTable.permissionId, permissionTable.id))
    .orderBy(roleTable.name);

  // Agrupar por role
  const rolesMap = new Map<string, RoleWithPermissions>();

  for (const row of result) {
    if (!rolesMap.has(row.role.id)) {
      rolesMap.set(row.role.id, {
        ...row.role,
        rolePermissions: [],
      });
    }

    if (row.role_permission && row.permission) {
      rolesMap.get(row.role.id)!.rolePermissions.push({
        ...row.role_permission,
        permission: row.permission,
      });
    }
  }

  return Array.from(rolesMap.values());
}

// ============================================================================
// QUERIES DE SESIONES
// ============================================================================

/**
 * Obtener sesión por ID
 */
export async function getSessionByToken(sessionToken: string) {
  const result = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.sessionToken, sessionToken))
    .limit(1);

  return result[0];
}

/**
 * Obtener sesiones activas de un usuario
 */
export async function getUserActiveSessions(userId: string) {
  return await db
    .select()
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, userId),
        sql`${sessionTable.expires} > NOW()`
      )
    );
}

/**
 * Limpiar sesiones expiradas
 */
export async function cleanExpiredSessions() {
  const result = await db
    .delete(sessionTable)
    .where(sql`${sessionTable.expires} <= NOW()`)
    .returning({ sessionToken: sessionTable.sessionToken });

  return result.length;
}

// ============================================================================
// QUERIES DE ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas generales del sistema
 */
export async function getSystemStats() {
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(userTable);
  const [rolesCount] = await db.select({ count: sql<number>`count(*)` }).from(roleTable);
  const [permissionsCount] = await db.select({ count: sql<number>`count(*)` }).from(permissionTable);
  const [activeSessionsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionTable)
    .where(sql`${sessionTable.expires} > NOW()`);

  return {
    users: Number(usersCount.count),
    roles: Number(rolesCount.count),
    permissions: Number(permissionsCount.count),
    activeSessions: Number(activeSessionsCount.count),
  };
}