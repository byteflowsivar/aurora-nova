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
  // Resumen
  // ============================================================================

  const totalItems = await prisma.menuItem.count()
  console.log(`\n✅ Menu items seeded successfully! Total items: ${totalItems}`)
  console.log('   - Level 1 (root): 2 items (Dashboard + Administración group)')
  console.log('   - Level 2 (children): 4 items (Usuarios, Roles, Permisos, Auditoria)')

  return {
    dashboard,
    adminGroup,
    users,
    roles,
    permissions: permissions_menu,
    audit: audit_menu
  }
}
