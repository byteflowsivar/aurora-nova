/**
 * Script de seeding para Aurora Nova usando Prisma ORM
 * Equivalente al seeds.sql pero con tipado TypeScript
 */

import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma/connection';
import { hash } from 'bcryptjs';

// Datos de permisos base
const permissions = [
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
const roles = [
  {
    name: 'Super Administrador',
    description: 'Acceso completo al sistema con todos los permisos',
  },
  {
    name: 'Administrador',
    description: 'Acceso administrativo con permisos limitados',
  },
  {
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
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { id: permission.id },
        update: {},
        create: permission
      });
    }

    // 2. Insertar roles
    console.log('👥 Insertando roles...');
    const insertedRoles = [];
    for (const role of roles) {
      const insertedRole = await prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role
      });
      insertedRoles.push(insertedRole);
    }

    // 3. Asignar permisos al Super Administrador (todos los permisos)
    const superAdminRole = insertedRoles.find(r => r.name === 'Super Administrador');
    if (superAdminRole) {
      console.log('🔐 Asignando todos los permisos al Super Administrador...');
      for (const permission of permissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        });
      }
    }

    // 4. Asignar permisos limitados al Administrador
    const adminRole = insertedRoles.find(r => r.name === 'Administrador');
    if (adminRole) {
      console.log('📋 Asignando permisos limitados al Administrador...');
      for (const permId of adminPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permId
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permId
          }
        });
      }
    }

    // 5. Asignar permisos básicos al Usuario
    const userRole = insertedRoles.find(r => r.name === 'Usuario');
    if (userRole) {
      console.log('👤 Asignando permisos básicos al Usuario...');
      for (const permId of userPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: userRole.id,
              permissionId: permId
            }
          },
          update: {},
          create: {
            roleId: userRole.id,
            permissionId: permId
          }
        });
      }
    }

    // 6. Verificar datos insertados
    const permCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const superAdminPermCount = await prisma.rolePermission.count({
      where: {
        role: {
          name: 'Super Administrador'
        }
      }
    });

    console.log('📊 Datos iniciales creados:');
    console.log(`   - Permisos: ${permCount}`);
    console.log(`   - Roles: ${roleCount}`);
    console.log(`   - Permisos de Super Administrador: ${superAdminPermCount}`);

    if (superAdminPermCount === permissions.length) {
      console.log('✅ Super Administrador tiene todos los permisos asignados');
    } else {
      console.warn('⚠️  Super Administrador no tiene todos los permisos');
    }

    console.log('🎉 Seeding completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
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