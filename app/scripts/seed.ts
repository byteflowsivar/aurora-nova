/**
 * Script de seeding para Aurora Nova usando Drizzle ORM
 * Equivalente al seeds.sql pero con tipado TypeScript
 */

import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

import { db } from '../src/lib/db/connection';
import {
  permissionTable,
  roleTable,
  rolePermissionTable,
  type InsertPermission,
  type InsertRole,
  type InsertRolePermission,
} from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';

// Datos de permisos base
const permissions: InsertPermission[] = [
  // Permisos de usuarios
  { id: 'user:create', module: 'Users', description: 'Crear nuevos usuarios' },
  { id: 'user:read', module: 'Users', description: 'Ver información de usuarios' },
  { id: 'user:update', module: 'Users', description: 'Actualizar información de usuarios' },
  { id: 'user:delete', module: 'Users', description: 'Eliminar usuarios' },
  { id: 'user:list', module: 'Users', description: 'Listar todos los usuarios' },

  // Permisos de roles
  { id: 'role:create', module: 'Roles', description: 'Crear nuevos roles' },
  { id: 'role:read', module: 'Roles', description: 'Ver información de roles' },
  { id: 'role:update', module: 'Roles', description: 'Actualizar información de roles' },
  { id: 'role:delete', module: 'Roles', description: 'Eliminar roles' },
  { id: 'role:list', module: 'Roles', description: 'Listar todos los roles' },
  { id: 'role:assign', module: 'Roles', description: 'Asignar roles a usuarios' },

  // Permisos de permisos (meta-permisos)
  { id: 'permission:create', module: 'Permissions', description: 'Crear nuevos permisos' },
  { id: 'permission:read', module: 'Permissions', description: 'Ver información de permisos' },
  { id: 'permission:update', module: 'Permissions', description: 'Actualizar información de permisos' },
  { id: 'permission:delete', module: 'Permissions', description: 'Eliminar permisos' },
  { id: 'permission:list', module: 'Permissions', description: 'Listar todos los permisos' },
];

// Datos de roles base
const roles: InsertRole[] = [
  {
    id: undefined, // Se generará automáticamente con uuidv7()
    name: 'Super Administrador',
    description: 'Acceso completo al sistema con todos los permisos',
  },
  {
    id: undefined,
    name: 'Administrador',
    description: 'Acceso administrativo con permisos limitados',
  },
  {
    id: undefined,
    name: 'Usuario',
    description: 'Usuario estándar con permisos básicos',
  },
];

// Permisos específicos por rol
const adminPermissions = [
  'user:read', 'user:list', 'user:update',
  'role:read', 'role:list',
  'permission:read', 'permission:list',
];

const userPermissions = [
  'user:read',
  'permission:read',
];

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seeding de la base de datos...');

    // 1. Insertar permisos
    console.log('📝 Insertando permisos...');
    await db.insert(permissionTable)
      .values(permissions)
      .onConflictDoNothing();

    // 2. Insertar roles
    console.log('👥 Insertando roles...');
    const insertedRoles = await db.insert(roleTable)
      .values(roles)
      .onConflictDoNothing()
      .returning();

    // Si no se insertaron roles (ya existían), obtenerlos
    let allRoles = insertedRoles;
    if (allRoles.length === 0) {
      allRoles = await db.select().from(roleTable);
    }

    // 3. Obtener todos los permisos insertados
    const allPermissions = await db.select().from(permissionTable);

    // 4. Asignar permisos al Super Administrador (todos los permisos)
    const superAdminRole = allRoles.find(r => r.name === 'Super Administrador');
    if (superAdminRole) {
      console.log('🔐 Asignando todos los permisos al Super Administrador...');
      const superAdminPerms: InsertRolePermission[] = allPermissions.map(p => ({
        roleId: superAdminRole.id,
        permissionId: p.id,
      }));

      await db.insert(rolePermissionTable)
        .values(superAdminPerms)
        .onConflictDoNothing();
    }

    // 5. Asignar permisos limitados al Administrador
    const adminRole = allRoles.find(r => r.name === 'Administrador');
    if (adminRole) {
      console.log('📋 Asignando permisos limitados al Administrador...');
      const adminPerms: InsertRolePermission[] = adminPermissions.map(permId => ({
        roleId: adminRole.id,
        permissionId: permId,
      }));

      await db.insert(rolePermissionTable)
        .values(adminPerms)
        .onConflictDoNothing();
    }

    // 6. Asignar permisos básicos al Usuario
    const userRole = allRoles.find(r => r.name === 'Usuario');
    if (userRole) {
      console.log('👤 Asignando permisos básicos al Usuario...');
      const userPerms: InsertRolePermission[] = userPermissions.map(permId => ({
        roleId: userRole.id,
        permissionId: permId,
      }));

      await db.insert(rolePermissionTable)
        .values(userPerms)
        .onConflictDoNothing();
    }

    // 7. Verificar datos insertados
    const [permCount] = await db.execute(sql`SELECT COUNT(*) as count FROM permission`);
    const [roleCount] = await db.execute(sql`SELECT COUNT(*) as count FROM role`);
    const [superAdminPermCount] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM role_permission rp
      JOIN role r ON rp.role_id = r.id
      WHERE r.name = 'Super Administrador'
    `);

    console.log('📊 Datos iniciales creados:');
    console.log(`   - Permisos: ${permCount.count}`);
    console.log(`   - Roles: ${roleCount.count}`);
    console.log(`   - Permisos de Super Administrador: ${superAdminPermCount.count}`);

    if (Number(superAdminPermCount.count) === permissions.length) {
      console.log('✅ Super Administrador tiene todos los permisos asignados');
    } else {
      console.warn('⚠️  Super Administrador no tiene todos los permisos');
    }

    console.log('🎉 Seeding completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  }
}

// Ejecutar seeding si el script se ejecuta directamente
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { seedDatabase };