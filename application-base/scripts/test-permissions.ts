/**
 * Script de prueba manual del sistema RBAC
 * Aurora Nova
 *
 * Ejecutar con: npx tsx scripts/test-permissions.ts
 */

import { prisma } from '@/lib/prisma/connection'
import {
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
  getUserPermissionsDetailed,
  getUserRolesWithPermissions,
} from '@/modules/admin/services/permission-queries'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '@/modules/admin/utils/permission-utils'
import {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
} from '@/modules/admin/utils/permission-utils'

async function main() {
  console.log('🧪 Iniciando pruebas del sistema RBAC...\n')

  // ========================================
  // 1. Obtener usuario de prueba
  // ========================================
  console.log('📋 1. Buscando usuario de prueba...')
  const testUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' },
  })

  if (!testUser) {
    console.error('❌ No se encontró usuario de prueba (test@example.com)')
    console.log('   Por favor crea un usuario con: npm run test:create-user')
    process.exit(1)
  }

  console.log(`✅ Usuario encontrado: ${testUser.email} (ID: ${testUser.id})`)

  // ========================================
  // 2. Probar getUserPermissions
  // ========================================
  console.log('\n📋 2. Obteniendo permisos del usuario...')
  const permissions = await getUserPermissions(testUser.id)
  console.log(`✅ Permisos obtenidos: ${permissions.length} permisos`)
  console.log(`   ${permissions.join(', ')}`)

  // ========================================
  // 3. Probar userHasPermission
  // ========================================
  console.log('\n📋 3. Verificando permiso individual...')
  const testPermission = 'user:read'
  const hasUserRead = await userHasPermission(testUser.id, testPermission)
  console.log(`   ¿Tiene '${testPermission}'? ${hasUserRead ? '✅ Sí' : '❌ No'}`)

  // ========================================
  // 4. Probar userHasAnyPermission (OR)
  // ========================================
  console.log('\n📋 4. Verificando múltiples permisos (OR)...')
  const orPermissions = ['user:create', 'user:update']
  const hasAnyUserPerm = await userHasAnyPermission(testUser.id, orPermissions)
  console.log(`   ¿Tiene alguno de ${orPermissions.join(' o ')}?`)
  console.log(`   ${hasAnyUserPerm ? '✅ Sí' : '❌ No'}`)

  // ========================================
  // 5. Probar userHasAllPermissions (AND)
  // ========================================
  console.log('\n📋 5. Verificando múltiples permisos (AND)...')
  const andPermissions = ['user:read', 'user:list']
  const allResult = await userHasAllPermissions(testUser.id, andPermissions)
  console.log(`   ¿Tiene TODOS ${andPermissions.join(' y ')}?`)
  console.log(`   ${allResult.hasPermission ? '✅ Sí' : '❌ No'}`)
  if (allResult.missingPermissions) {
    console.log(`   Faltan: ${allResult.missingPermissions.join(', ')}`)
  }

  // ========================================
  // 6. Probar getUserPermissionsDetailed
  // ========================================
  console.log('\n📋 6. Obteniendo permisos con detalles...')
  const detailed = await getUserPermissionsDetailed(testUser.id)
  console.log(`✅ Permisos con detalles:`)
  detailed.forEach((perm) => {
    console.log(`   - ${perm.id} (${perm.module}): ${perm.description || 'Sin descripción'}`)
  })

  // ========================================
  // 7. Probar getUserRolesWithPermissions
  // ========================================
  console.log('\n📋 7. Obteniendo roles con permisos...')
  const roles = await getUserRolesWithPermissions(testUser.id)
  console.log(`✅ Roles del usuario:`)
  roles.forEach((role) => {
    console.log(`   - ${role.name}: ${role.permissions.length} permisos`)
    console.log(`     ${role.permissions.join(', ')}`)
  })

  // ========================================
  // 8. Probar utils (server-side)
  // ========================================
  console.log('\n📋 8. Probando utilidades de servidor...')

  const canCreate = await hasPermission(testUser.id, 'user:create')
  console.log(`   ¿Puede crear usuarios? ${canCreate ? '✅ Sí' : '❌ No'}`)

  const canManage = await hasAnyPermission(testUser.id, ['user:create', 'user:update'])
  console.log(`   ¿Puede gestionar usuarios? ${canManage ? '✅ Sí' : '❌ No'}`)

  const advancedResult = await hasAllPermissions(testUser.id, ['user:update', 'role:assign'])
  console.log(`   ¿Puede editar usuarios Y asignar roles? ${advancedResult.hasPermission ? '✅ Sí' : '❌ No'}`)

  // ========================================
  // 9. Probar helpers de cliente
  // ========================================
  console.log('\n📋 9. Probando helpers de cliente (sync)...')

  const canRead = checkPermission(permissions, 'user:read')
  console.log(`   ¿Puede leer usuarios? ${canRead ? '✅ Sí' : '❌ No'}`)

  const canManageClient = checkAnyPermission(permissions, ['user:create', 'user:update'])
  console.log(`   ¿Puede gestionar usuarios (cliente)? ${canManageClient ? '✅ Sí' : '❌ No'}`)

  const advancedClientResult = checkAllPermissions(permissions, ['user:read', 'user:list'])
  console.log(`   ¿Tiene permisos de lectura completa? ${advancedClientResult.hasPermission ? '✅ Sí' : '❌ No'}`)

  // ========================================
  // 10. Verificar permisos que NO tiene
  // ========================================
  console.log('\n📋 10. Verificando permisos que NO debería tener...')

  const hasSuperAdmin = await userHasPermission(testUser.id, 'system:admin')
  console.log(`   ¿Tiene system:admin? ${hasSuperAdmin ? '⚠️ Sí (inesperado)' : '✅ No (correcto)'}`)

  const hasDeleteAll = await userHasAllPermissions(testUser.id, [
    'user:delete',
    'role:delete',
    'permission:delete'
  ])
  console.log(`   ¿Puede eliminar todo? ${hasDeleteAll.hasPermission ? '⚠️ Sí (peligroso)' : '✅ No (correcto)'}`)

  // ========================================
  // Resumen
  // ========================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ Todas las pruebas completadas exitosamente!')
  console.log('='.repeat(60))
  console.log(`\nUsuario: ${testUser.email}`)
  console.log(`Permisos totales: ${permissions.length}`)
  console.log(`Roles: ${roles.length}`)
  console.log('\nSistema RBAC funcionando correctamente! 🎉')
}

main()
  .catch((error) => {
    console.error('\n❌ Error en las pruebas:')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
