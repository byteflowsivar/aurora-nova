/**
 * Esquemas Drizzle ORM para Aurora Nova
 * Equivalente exacto al schema.sql con tipado TypeScript
 * Compatible con PostgreSQL 18+ y UUIDs v7
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  primaryKey,
  index,
  check,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ============================================================================
// TABLA USER - Usuarios del sistema (Compatible con Auth.js)
// ============================================================================
export const userTable = pgTable('user', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()::text`), // Auth.js expects text ID
  name: text('name'), // Auth.js field
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified'), // Auth.js format without timezone
  image: text('image'), // Auth.js field for profile images
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Constraints de validación
  emailCheck: check('user_email_check', sql`${table.email} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`),
  // Índices
  emailIdx: index('idx_user_email').on(table.email),
}));

// ============================================================================
// TABLA SESSION - Sesiones de Auth.js
// ============================================================================
export const sessionTable = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(), // Auth.js format
  userId: text('userId').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
}, (table) => ({
  // Índices
  userIdIdx: index('idx_session_user_id').on(table.userId),
  expiresIdx: index('idx_session_expires').on(table.expires),
}));

// ============================================================================
// TABLA ACCOUNT - Cuentas de proveedores Auth.js (OAuth, credentials)
// ============================================================================
export const accountTable = pgTable('account', {
  userId: text('userId').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // "credentials", "oauth", etc.
  provider: text('provider').notNull(), // "credentials", "google", etc.
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  // Primary key compuesto
  compoundKey: primaryKey(table.provider, table.providerAccountId),
  // Índices
  userIdIdx: index('idx_account_user_id').on(table.userId),
}));

// ============================================================================
// TABLA VERIFICATION_TOKEN - Tokens de verificación Auth.js
// ============================================================================
export const verificationTokenTable = pgTable('verificationToken', {
  identifier: text('identifier').notNull(), // email u otro identificador
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}, (table) => ({
  // Primary key compuesto
  compoundKey: primaryKey(table.identifier, table.token),
}));

// ============================================================================
// TABLA USER_CREDENTIALS - Credenciales de usuarios (passwords)
// ============================================================================
export const userCredentialsTable = pgTable('user_credentials', {
  userId: text('user_id').primaryKey().references(() => userTable.id, { onDelete: 'cascade' }),
  hashedPassword: varchar('hashed_password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Índices
  userIdIdx: index('idx_user_credentials_user_id').on(table.userId),
}));

// ============================================================================
// TABLA ROLE - Roles del sistema RBAC
// ============================================================================
export const roleTable = pgTable('role', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`), // UUID v7 nativo de PostgreSQL 18+
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  userId: text('user_id').notNull().references(() => userTable.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roleTable.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by').references(() => userTable.id), // Auditoría
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

export const userRelations = relations(userTable, ({ many, one }) => ({
  sessions: many(sessionTable),
  accounts: many(accountTable),
  credentials: one(userCredentialsTable),
  userRoles: many(userRoleTable),
  createdRoleAssignments: many(userRoleTable, { relationName: 'createdBy' }),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));

export const accountRelations = relations(accountTable, ({ one }) => ({
  user: one(userTable, {
    fields: [accountTable.userId],
    references: [userTable.id],
  }),
}));

export const userCredentialsRelations = relations(userCredentialsTable, ({ one }) => ({
  user: one(userTable, {
    fields: [userCredentialsTable.userId],
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
export type Account = typeof accountTable.$inferSelect;
export type VerificationToken = typeof verificationTokenTable.$inferSelect;
export type UserCredentials = typeof userCredentialsTable.$inferSelect;
export type Role = typeof roleTable.$inferSelect;
export type Permission = typeof permissionTable.$inferSelect;
export type UserRole = typeof userRoleTable.$inferSelect;
export type RolePermission = typeof rolePermissionTable.$inferSelect;

// Tipos para inserts (datos que se envían a la BD)
export type InsertUser = typeof userTable.$inferInsert;
export type InsertSession = typeof sessionTable.$inferInsert;
export type InsertAccount = typeof accountTable.$inferInsert;
export type InsertVerificationToken = typeof verificationTokenTable.$inferInsert;
export type InsertUserCredentials = typeof userCredentialsTable.$inferInsert;
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