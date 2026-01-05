/**
 * Seeder de Items del Menú
 * Aurora Nova - Menu System
 *
 * Crea la estructura inicial del menú de navegación del sistema:
 * - Dashboard (nivel 1, acceso público)
 * - Administración (nivel 1, grupo)
 *   - Usuarios (nivel 2, requiere user:list)
 *   - Roles (nivel 2, requiere role:list)
 *   - Permisos (nivel 2, requiere permission:list)
 */

import { PrismaClient } from '../../src/lib/prisma/generated'

const prisma = new PrismaClient()

export async function seedMenuItems() {
  console.log('🍔 Seeding menu items...')

  // Verificar que existen los permisos necesarios
  const permissions = await prisma.permission.findMany({
    where: {
      id: {
        in: ['user:list', 'role:list', 'permission:list']
      }
    }
  })

  if (permissions.length !== 3) {
    console.warn('⚠️  Warning: Some permissions not found. Menu items will be created without permission links.')
  }

  // Eliminar items existentes para recrearlos (idempotencia)
  await prisma.menuItem.deleteMany({})
  console.log('  🗑️  Cleared existing menu items')

  // ============================================================================
  // NIVEL 1: Dashboard (item directo sin permiso)
  // ============================================================================

  const dashboard = await prisma.menuItem.create({
    data: {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: 'LayoutDashboard',
      order: 1,
      isActive: true,
      permissionId: null, // Accesible para todos los usuarios autenticados
      parentId: null
    }
  })

  console.log('  ✓ Created: Dashboard (level 1)')

  // ============================================================================
  // NIVEL 1: Grupo de Administración (sin href, agrupa items del nivel 2)
  // ============================================================================

  const adminGroup = await prisma.menuItem.create({
    data: {
      title: 'Administración',
      href: null, // NULL = es un grupo, no navega
      icon: 'Settings',
      order: 2,
      isActive: true,
      permissionId: null, // El grupo es visible, pero sus hijos requieren permisos
      parentId: null
    }
  })

  console.log('  ✓ Created: Administración Group (level 1)')

  // ============================================================================
  // NIVEL 2: Hijos del grupo Administración
  // ============================================================================

  // Usuarios
  const users = await prisma.menuItem.create({
    data: {
      title: 'Usuarios',
      href: '/admin/users',
      icon: 'Users',
      order: 1,
      isActive: true,
      permissionId: 'user:list', // Requiere permiso
      parentId: adminGroup.id // Referencia al ID generado
    }
  })

  console.log('  ✓ Created: Usuarios (level 2, child of Administración)')

  // Roles
  const roles = await prisma.menuItem.create({
    data: {
      title: 'Roles',
      href: '/admin/roles',
      icon: 'Shield',
      order: 2,
      isActive: true,
      permissionId: 'role:list', // Requiere permiso
      parentId: adminGroup.id // Referencia al ID generado
    }
  })

  console.log('  ✓ Created: Roles (level 2, child of Administración)')

  // Permisos
  const permissions_menu = await prisma.menuItem.create({
    data: {
      title: 'Permisos',
      href: '/admin/permissions',
      icon: 'Key',
      order: 3,
      isActive: true,
      permissionId: 'permission:list', // Requiere permiso
      parentId: adminGroup.id // Referencia al ID generado
    }
  })

  console.log('  ✓ Created: Permisos (level 2, child of Administración)')

  // Auditoria
  const audit_menu = await prisma.menuItem.create({
    data: {
      title: 'Auditoria',
      href: '/admin/audit',
      icon: 'FileText',
      order: 4,
      isActive: true,
      permissionId: 'audit:view', // Requiere permiso
      parentId: adminGroup.id // Referencia al ID generado
    }
  })

  console.log('  ✓ Created: Auditoria (level 2, child of Administración)')

  // ============================================================================
  // NIVEL 1: Grupo de Tienda (sin href, agrupa items del nivel 2)
  // ============================================================================

  const storeGroup = await prisma.menuItem.create({
    data: {
      title: 'Tienda',
      href: null,
      icon: 'Store',
      order: 3,
      isActive: true,
      permissionId: null,
      parentId: null
    }
  });

  console.log('  ✓ Created: Tienda Group (level 1)');

  // ============================================================================
  // NIVEL 2: Hijos del grupo Tienda
  // ============================================================================

  await prisma.menuItem.create({
    data: {
      title: 'Productos',
      href: '/admin/store/products',
      icon: 'Package',
      order: 1,
      isActive: true,
      permissionId: 'product:list',
      parentId: storeGroup.id
    }
  });

  console.log('  ✓ Created: Productos (level 2, child of Tienda)');

  await prisma.menuItem.create({
    data: {
      title: 'Pedidos',
      href: '/admin/store/orders',
      icon: 'ShoppingCart',
      order: 2,
      isActive: true,
      permissionId: 'order:list',
      parentId: storeGroup.id
    }
  });

  console.log('  ✓ Created: Pedidos (level 2, child of Tienda)');

  await prisma.menuItem.create({
    data: {
      title: 'Inventario',
      href: '/admin/store/inventory',
      icon: 'Boxes',
      order: 3,
      isActive: true,
      permissionId: 'inventory:list',
      parentId: storeGroup.id
    }
  });

  console.log('  ✓ Created: Inventario (level 2, child of Tienda)');

  // ============================================================================
  // Resumen
  // ============================================================================

  const totalItems = await prisma.menuItem.count()
  console.log(`\n✅ Menu items seeded successfully! Total items: ${totalItems}`)
  console.log('   - Level 1 (root): 3 items (Dashboard, Administración, Tienda)')
  console.log('   - Level 2 (children): 7 items (Usuarios, Roles, Permisos, Auditoria, Productos, Pedidos, Inventario)')

  return {
    dashboard,
    adminGroup,
    storeGroup,
    users,
    roles,
    permissions: permissions_menu,
    audit: audit_menu,
  }
}
