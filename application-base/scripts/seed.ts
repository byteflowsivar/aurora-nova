/**
 * Script de seeding para Aurora Nova usando Prisma ORM
 * Equivalente al seeds.sql pero con tipado TypeScript
 */

import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma/connection';
import { seedMenuItems } from '../prisma/seeds/menu-items';

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
  { id: 'user:assign-roles', module: 'Users', description: 'Asignar roles a usuarios' },
  { id: 'role:assign-permissions', module: 'Roles', description: 'Asignar permisos a roles' },

  // Permisos de permisos (meta-permisos)
  { id: 'permission:create', module: 'Permissions', description: 'Crear nuevos permisos' },
  { id: 'permission:read', module: 'Permissions', description: 'Ver información de permisos' },
  { id: 'permission:update', module: 'Permissions', description: 'Actualizar información de permisos' },
  { id: 'permission:delete', module: 'Permissions', description: 'Eliminar permisos' },
  { id: 'permission:list', module: 'Permissions', description: 'Listar todos los permisos' },

  // Permisos de menú
  { id: 'menu:manage', module: 'Menu', description: 'Gestionar items del menú' },

  // Permisos de auditoría
  { id: 'audit:view', module: 'Audit', description: 'Ver registros de auditoría' },
  { id: 'audit:manage', module: 'Audit', description: 'Gestionar auditoría y registros' },

  // Permisos de productos (e-commerce)
  { id: 'product:create', module: 'Products', description: 'Crear nuevos productos' },
  { id: 'product:read', module: 'Products', description: 'Ver información de productos' },
  { id: 'product:update', module: 'Products', description: 'Actualizar información de productos' },
  { id: 'product:delete', module: 'Products', description: 'Eliminar productos' },
  { id: 'product:list', module: 'Products', description: 'Listar todos los productos' },
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
  'menu:manage',
  'product:create', 'product:read', 'product:update', 'product:delete', 'product:list',
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

    // 6. Seed Menu Items
    console.log('\n🍔 Seeding menu items...');
    await seedMenuItems();

    // 7. Seed E-commerce data
    await seedECommerce();

    // 8. Verificar datos insertados
    const permCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const menuItemCount = await prisma.menuItem.count();
    const productCount = await prisma.product.count();
    const variantCount = await prisma.productVariant.count();
    const superAdminPermCount = await prisma.rolePermission.count({
      where: {
        role: {
          name: 'Super Administrador'
        }
      }
    });

    console.log('\n📊 Datos iniciales creados:');
    console.log(`   - Permisos: ${permCount}`);
    console.log(`   - Roles: ${roleCount}`);
    console.log(`   - Items del menú: ${menuItemCount}`);
    console.log(`   - Productos: ${productCount}`);
    console.log(`   - Variantes de Producto: ${variantCount}`);
    console.log(`   - Permisos de Super Administrador: ${superAdminPermCount}`);

    if (superAdminPermCount === permissions.length) {
      console.log('✅ Super Administrador tiene todos los permisos asignados');
    } else {
      console.warn('⚠️  Super Administrador no tiene todos los permisos');
    }

    console.log('\n🎉 Seeding completado exitosamente!');

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

async function seedECommerce() {
  console.log('\n🛍️ Seeding e-commerce data...');

  // Sample Products
  const products = [
    {
      name: 'Laptop Pro Avanzada',
      description: 'Una laptop potente para profesionales creativos.',
      slug: 'laptop-pro-avanzada',
      isActive: true,
      variants: [
        {
          sku: 'LP-PRO-14-512',
          price: 1299.99,
          stock: 50,
          attributes: { size: '14"', storage: '512GB', color: 'Silver' },
          images: [
            { url: 'https://placehold.co/600x400/silver/white?text=Laptop+14"', altText: 'Laptop Pro 14 inch' },
            { url: 'https://placehold.co/600x400/EAEAEA/333?text=Side+View', altText: 'Side view' },
          ]
        },
        {
          sku: 'LP-PRO-16-1TB',
          price: 1999.99,
          stock: 30,
          attributes: { size: '16"', storage: '1TB', color: 'Space Gray' },
          images: [
            { url: 'https://placehold.co/600x400/555/white?text=Laptop+16"', altText: 'Laptop Pro 16 inch' }
          ]
        },
      ]
    },
    {
      name: 'Camiseta con Logo',
      description: 'Camiseta de algodón suave con el logo de Aurora Nova.',
      slug: 'camiseta-logo-aurora-nova',
      isActive: true,
      variants: [
        {
          sku: 'TS-LOGO-BLK-M',
          price: 25.50,
          stock: 120,
          attributes: { color: 'Black', size: 'M' },
          images: [ { url: 'https://placehold.co/600x400/000/white?text=T-Shirt+Black', altText: 'Black T-Shirt' }]
        },
        {
          sku: 'TS-LOGO-WHT-M',
          price: 25.50,
          stock: 150,
          attributes: { color: 'White', size: 'M' },
          images: [ { url: 'https://placehold.co/600x400/FFF/000?text=T-Shirt+White', altText: 'White T-Shirt' }]
        }
      ]
    }
  ];

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: { name: productData.name, description: productData.description },
      create: {
        name: productData.name,
        description: productData.description,
        slug: productData.slug,
        isActive: productData.isActive,
      },
    });

    for (const variantData of productData.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: variantData.sku },
        update: {},
        create: {
          productId: product.id,
          sku: variantData.sku,
          price: variantData.price,
          attributes: variantData.attributes,
          stock: variantData.stock,
        },
      });

      // Set initial stock via inventory movement
      const existingMovement = await prisma.inventoryMovement.findFirst({
        where: { variantId: variant.id, type: 'INITIAL_STOCK' },
      });

      if (!existingMovement) {
          await prisma.inventoryMovement.create({
              data: {
                  variantId: variant.id,
                  type: 'INITIAL_STOCK',
                  quantityChange: variantData.stock,
                  reason: 'Initial seed data',
              }
          });
      }

      // We check for image existence before creating to prevent duplicates on re-seeding
      for (const imageData of variantData.images) {
          const existingImage = await prisma.productImage.findFirst({
              where: { url: imageData.url, variantId: variant.id }
          });

          if (!existingImage) {
              await prisma.productImage.create({
                  data: {
                      url: imageData.url,
                      altText: imageData.altText,
                      productId: product.id,
                      variantId: variant.id
                  }
              });
          }
      }
    }
  }
   console.log('✅ E-commerce data seeded.');
}

export { seedDatabase };