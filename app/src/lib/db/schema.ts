/**
 * Esquemas Drizzle ORM para Aurora Nova
 * Equivalente exacto al schema.sql con tipado TypeScript
 * Compatible con PostgreSQL 18+ y UUIDs v7
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  primaryKey,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ============================================================================
// TABLA USER - Usuarios del sistema
// ============================================================================
export const userTable = pgTable('user', {
  id: uuid('id').primaryKey(), // Generado por Lucia Auth
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Constraints de validación
  firstNameCheck: check('user_first_name_check', sql`LENGTH(TRIM(${table.firstName})) > 0`),
  lastNameCheck: check('user_last_name_check', sql`LENGTH(TRIM(${table.lastName})) > 0`),
  emailCheck: check('user_email_check', sql`${table.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`),
  // Índices
  emailIdx: index('idx_user_email').on(table.email),
}));

// ============================================================================
// TABLA SESSION - Sesiones de Lucia Auth
// ============================================================================
export const sessionTable = pgTable('session', {
  id: uuid('id').primaryKey(), // Generado por Lucia Auth
  userId: uuid('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  // Índices
  userIdIdx: index('idx_session_user_id').on(table.userId),
  expiresAtIdx: index('idx_session_expires_at').on(table.expiresAt),
}));

// ============================================================================
// TABLA KEY - Claves de autenticación de Lucia Auth
// ============================================================================
export const keyTable = pgTable('key', {
  id: varchar('id', { length: 255 }).primaryKey(), // Semántico: "email:user@domain.com"
  userId: uuid('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  hashedPassword: varchar('hashed_password', { length: 255 }), // Nullable para OAuth
}, (table) => ({
  // Índices
  userIdIdx: index('idx_key_user_id').on(table.userId),
}));

// ============================================================================
// TABLA ROLE - Roles del sistema RBAC
// ============================================================================
export const roleTable = pgTable('role', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`), // UUID v7 nativo de PostgreSQL 18+
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Constraints de validación
  nameCheck: check('role_name_check', sql`LENGTH(TRIM(${table.name})) > 0`),
}));

// ============================================================================
// TABLA PERMISSION - Permisos granulares (PK semántica según ADR-003)
// ============================================================================
export const permissionTable = pgTable('permission', {
  id: varchar('id', { length: 100 }).primaryKey(), // Semántico: "user:create"
  module: varchar('module', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Constraints de validación
  idCheck: check('permission_id_check', sql`${table.id} ~* '^[a-z_]+:[a-z_]+$'`),
  moduleCheck: check('permission_module_check', sql`LENGTH(TRIM(${table.module})) > 0`),
  // Índices
  moduleIdx: index('idx_permission_module').on(table.module),
}));

// ============================================================================
// TABLA USER_ROLE - Asignación de roles a usuarios (muchos a muchos)
// ============================================================================
export const userRoleTable = pgTable('user_role', {
  userId: uuid('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roleTable.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => userTable.id), // Auditoría
}, (table) => ({
  // Clave primaria compuesta
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
  // Índices
  userIdIdx: index('idx_user_role_user_id').on(table.userId),
  roleIdIdx: index('idx_user_role_role_id').on(table.roleId),
}));

// ============================================================================
// TABLA ROLE_PERMISSION - Asignación de permisos a roles (muchos a muchos)
// ============================================================================
export const rolePermissionTable = pgTable('role_permission', {
  roleId: uuid('role_id').notNull().references(() => roleTable.id, { onDelete: 'cascade' }),
  permissionId: varchar('permission_id', { length: 100 }).notNull().references(() => permissionTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Clave primaria compuesta
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  // Índices
  roleIdIdx: index('idx_role_permission_role_id').on(table.roleId),
  permissionIdIdx: index('idx_role_permission_permission_id').on(table.permissionId),
}));

// ============================================================================
// RELACIONES DRIZZLE (para joins tipados)
// ============================================================================

export const userRelations = relations(userTable, ({ many }) => ({
  sessions: many(sessionTable),
  keys: many(keyTable),
  userRoles: many(userRoleTable),
  createdRoleAssignments: many(userRoleTable, { relationName: 'createdBy' }),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));

export const keyRelations = relations(keyTable, ({ one }) => ({
  user: one(userTable, {
    fields: [keyTable.userId],
    references: [userTable.id],
  }),
}));

export const roleRelations = relations(roleTable, ({ many }) => ({
  userRoles: many(userRoleTable),
  rolePermissions: many(rolePermissionTable),
}));

export const permissionRelations = relations(permissionTable, ({ many }) => ({
  rolePermissions: many(rolePermissionTable),
}));

export const userRoleRelations = relations(userRoleTable, ({ one }) => ({
  user: one(userTable, {
    fields: [userRoleTable.userId],
    references: [userTable.id],
  }),
  role: one(roleTable, {
    fields: [userRoleTable.roleId],
    references: [roleTable.id],
  }),
  creator: one(userTable, {
    fields: [userRoleTable.createdBy],
    references: [userTable.id],
    relationName: 'createdBy',
  }),
}));

export const rolePermissionRelations = relations(rolePermissionTable, ({ one }) => ({
  role: one(roleTable, {
    fields: [rolePermissionTable.roleId],
    references: [roleTable.id],
  }),
  permission: one(permissionTable, {
    fields: [rolePermissionTable.permissionId],
    references: [permissionTable.id],
  }),
}));

// ============================================================================
// TIPOS TYPESCRIPT DERIVADOS
// ============================================================================

// Tipos para selects (datos que vienen de la BD)
export type User = typeof userTable.$inferSelect;
export type Session = typeof sessionTable.$inferSelect;
export type Key = typeof keyTable.$inferSelect;
export type Role = typeof roleTable.$inferSelect;
export type Permission = typeof permissionTable.$inferSelect;
export type UserRole = typeof userRoleTable.$inferSelect;
export type RolePermission = typeof rolePermissionTable.$inferSelect;

// Tipos para inserts (datos que se envían a la BD)
export type InsertUser = typeof userTable.$inferInsert;
export type InsertSession = typeof sessionTable.$inferInsert;
export type InsertKey = typeof keyTable.$inferInsert;
export type InsertRole = typeof roleTable.$inferInsert;
export type InsertPermission = typeof permissionTable.$inferInsert;
export type InsertUserRole = typeof userRoleTable.$inferInsert;
export type InsertRolePermission = typeof rolePermissionTable.$inferInsert;

// Tipos complejos con relaciones
export type UserWithRoles = User & {
  userRoles: (UserRole & {
    role: Role;
  })[];
};

export type RoleWithPermissions = Role & {
  rolePermissions: (RolePermission & {
    permission: Permission;
  })[];
};

export type UserWithFullData = User & {
  userRoles: (UserRole & {
    role: Role & {
      rolePermissions: (RolePermission & {
        permission: Permission;
      })[];
    };
  })[];
};