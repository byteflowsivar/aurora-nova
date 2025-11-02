/**
 * Tests unitarios para permission-queries
 * T025: Tests de autorización - RBAC Queries
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { prismaMock, resetPrismaMock } from '../mocks/prisma'
import {
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
  getUserPermissionsDetailed,
  getUserRolesWithPermissions,
  getAllPermissions,
  getPermissionsByModule,
  permissionExists,
} from '@/lib/prisma/permission-queries'

describe('permission-queries', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  describe('getUserPermissions', () => {
    it('debe retornar array de IDs de permisos del usuario', async () => {
      const userId = 'user-123'
      const mockPermissions = [
        { permissionId: 'user:create' },
        { permissionId: 'user:read' },
        { permissionId: 'role:manage' },
      ]

      prismaMock.rolePermission.findMany.mockResolvedValue(
        mockPermissions as any
      )

      const result = await getUserPermissions(userId)

      expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
        where: {
          role: {
            userRoles: {
              some: {
                userId,
              },
            },
          },
        },
        select: {
          permissionId: true,
        },
        distinct: ['permissionId'],
      })

      expect(result).toEqual(['user:create', 'user:read', 'role:manage'])
    })

    it('debe retornar array vacío si el usuario no tiene permisos', async () => {
      prismaMock.rolePermission.findMany.mockResolvedValue([])

      const result = await getUserPermissions('user-without-perms')

      expect(result).toEqual([])
    })

    it('debe manejar errores de base de datos', async () => {
      prismaMock.rolePermission.findMany.mockRejectedValue(
        new Error('Database error')
      )

      await expect(getUserPermissions('user-123')).rejects.toThrow(
        'Database error'
      )
    })
  })

  describe('userHasPermission', () => {
    it('debe retornar true si el usuario tiene el permiso', async () => {
      const userId = 'user-123'
      const permissionId = 'user:create'

      prismaMock.rolePermission.count.mockResolvedValue(1)

      const result = await userHasPermission(userId, permissionId)

      expect(prismaMock.rolePermission.count).toHaveBeenCalledWith({
        where: {
          permissionId,
          role: {
            userRoles: {
              some: {
                userId,
              },
            },
          },
        },
      })

      expect(result).toBe(true)
    })

    it('debe retornar false si el usuario no tiene el permiso', async () => {
      prismaMock.rolePermission.count.mockResolvedValue(0)

      const result = await userHasPermission('user-123', 'admin:super')

      expect(result).toBe(false)
    })

    it('debe retornar true incluso si el usuario tiene el permiso por múltiples roles', async () => {
      // Simula que el usuario tiene el permiso a través de 2 roles diferentes
      prismaMock.rolePermission.count.mockResolvedValue(2)

      const result = await userHasPermission('user-123', 'user:read')

      expect(result).toBe(true)
    })
  })

  describe('userHasAnyPermission', () => {
    it('debe retornar true si el usuario tiene al menos uno de los permisos', async () => {
      const userId = 'user-123'
      const permissionIds = ['user:create', 'user:update', 'user:delete']

      prismaMock.rolePermission.count.mockResolvedValue(1)

      const result = await userHasAnyPermission(userId, permissionIds)

      expect(prismaMock.rolePermission.count).toHaveBeenCalledWith({
        where: {
          permissionId: {
            in: permissionIds,
          },
          role: {
            userRoles: {
              some: {
                userId,
              },
            },
          },
        },
      })

      expect(result).toBe(true)
    })

    it('debe retornar false si el usuario no tiene ninguno de los permisos', async () => {
      prismaMock.rolePermission.count.mockResolvedValue(0)

      const result = await userHasAnyPermission('user-123', [
        'admin:super',
        'system:config',
      ])

      expect(result).toBe(false)
    })

    it('debe retornar false si el array de permisos está vacío', async () => {
      const result = await userHasAnyPermission('user-123', [])

      expect(result).toBe(false)
      expect(prismaMock.rolePermission.count).not.toHaveBeenCalled()
    })

    it('debe retornar true si el usuario tiene múltiples de los permisos solicitados', async () => {
      prismaMock.rolePermission.count.mockResolvedValue(3)

      const result = await userHasAnyPermission('user-123', [
        'user:create',
        'user:read',
        'user:update',
      ])

      expect(result).toBe(true)
    })
  })

  describe('userHasAllPermissions', () => {
    it('debe retornar hasPermission: true si el usuario tiene todos los permisos', async () => {
      const userId = 'user-123'
      const permissionIds = ['user:create', 'user:read']

      // Mock getUserPermissions que es llamada internamente
      prismaMock.rolePermission.findMany.mockResolvedValue([
        { permissionId: 'user:create' },
        { permissionId: 'user:read' },
        { permissionId: 'user:update' },
      ] as any)

      const result = await userHasAllPermissions(userId, permissionIds)

      expect(result).toEqual({
        hasPermission: true,
        missingPermissions: undefined,
      })
    })

    it('debe retornar hasPermission: false y listar permisos faltantes', async () => {
      const userId = 'user-123'
      const permissionIds = ['user:create', 'user:delete', 'role:manage']

      // Usuario solo tiene user:create
      prismaMock.rolePermission.findMany.mockResolvedValue([
        { permissionId: 'user:create' },
      ] as any)

      const result = await userHasAllPermissions(userId, permissionIds)

      expect(result).toEqual({
        hasPermission: false,
        missingPermissions: ['user:delete', 'role:manage'],
      })
    })

    it('debe retornar hasPermission: true si el array de permisos está vacío', async () => {
      const result = await userHasAllPermissions('user-123', [])

      expect(result).toEqual({
        hasPermission: true,
      })
      expect(prismaMock.rolePermission.findMany).not.toHaveBeenCalled()
    })

    it('debe retornar todos los permisos como faltantes si el usuario no tiene ninguno', async () => {
      prismaMock.rolePermission.findMany.mockResolvedValue([])

      const result = await userHasAllPermissions('user-123', [
        'admin:super',
        'system:config',
      ])

      expect(result).toEqual({
        hasPermission: false,
        missingPermissions: ['admin:super', 'system:config'],
      })
    })
  })

  describe('getUserPermissionsDetailed', () => {
    it('debe retornar información detallada de permisos', async () => {
      const userId = 'user-123'
      const mockDetailedPermissions = [
        {
          permission: {
            id: 'perm-1',
            module: 'user:create',
            description: 'Create users',
          },
        },
        {
          permission: {
            id: 'perm-2',
            module: 'user:read',
            description: 'Read users',
          },
        },
      ]

      prismaMock.rolePermission.findMany.mockResolvedValue(
        mockDetailedPermissions as any
      )

      const result = await getUserPermissionsDetailed(userId)

      expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
        where: {
          role: {
            userRoles: {
              some: {
                userId,
              },
            },
          },
        },
        select: {
          permission: {
            select: {
              id: true,
              module: true,
              description: true,
            },
          },
        },
        distinct: ['permissionId'],
      })

      expect(result).toEqual([
        {
          id: 'perm-1',
          module: 'user:create',
          description: 'Create users',
        },
        {
          id: 'perm-2',
          module: 'user:read',
          description: 'Read users',
        },
      ])
    })

    it('debe retornar array vacío si no hay permisos', async () => {
      prismaMock.rolePermission.findMany.mockResolvedValue([])

      const result = await getUserPermissionsDetailed('user-no-perms')

      expect(result).toEqual([])
    })
  })

  describe('getUserRolesWithPermissions', () => {
    it('debe retornar roles del usuario con sus permisos', async () => {
      const userId = 'user-123'
      const mockUserWithRoles = {
        userRoles: [
          {
            role: {
              id: 'role-1',
              name: 'Admin',
              description: 'Administrator role',
              rolePermissions: [
                { permissionId: 'user:create' },
                { permissionId: 'user:read' },
              ],
            },
          },
          {
            role: {
              id: 'role-2',
              name: 'Editor',
              description: 'Editor role',
              rolePermissions: [{ permissionId: 'content:edit' }],
            },
          },
        ],
      }

      prismaMock.user.findUnique.mockResolvedValue(mockUserWithRoles as any)

      const result = await getUserRolesWithPermissions(userId)

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  rolePermissions: {
                    select: {
                      permissionId: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      expect(result).toEqual([
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          permissions: ['user:create', 'user:read'],
        },
        {
          id: 'role-2',
          name: 'Editor',
          description: 'Editor role',
          permissions: ['content:edit'],
        },
      ])
    })

    it('debe retornar array vacío si el usuario no existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null)

      const result = await getUserRolesWithPermissions('nonexistent-user')

      expect(result).toEqual([])
    })

    it('debe retornar array vacío si el usuario no tiene roles', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        userRoles: [],
      } as any)

      const result = await getUserRolesWithPermissions('user-no-roles')

      expect(result).toEqual([])
    })
  })

  // ===========================================================================
  // TESTS PARA QUERIES DE PERMISOS (CATÁLOGO)
  // ===========================================================================

  describe('getAllPermissions', () => {
    it('debe retornar todos los permisos del sistema ordenados por módulo e id', async () => {
      const mockPermissions = [
        { id: 'role:create', module: 'role', description: 'Crear roles' },
        { id: 'user:create', module: 'user', description: 'Crear usuarios' },
        { id: 'user:read', module: 'user', description: 'Leer usuarios' },
      ]
      prismaMock.permission.findMany.mockResolvedValue(mockPermissions as any)

      const result = await getAllPermissions()

      expect(prismaMock.permission.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          module: true,
          description: true,
        },
        orderBy: [{ module: 'asc' }, { id: 'asc' }],
      })
      expect(result).toEqual(mockPermissions)
    })

    it('debe retornar un array vacío si no hay permisos en el sistema', async () => {
      prismaMock.permission.findMany.mockResolvedValue([])
      const result = await getAllPermissions()
      expect(result).toEqual([])
    })
  })

  describe('getPermissionsByModule', () => {
    it('debe retornar permisos de un módulo específico', async () => {
      const moduleName = 'user'
      const mockPermissions = [
        { id: 'user:create', module: 'user', description: 'Crear usuarios' },
        { id: 'user:read', module: 'user', description: 'Leer usuarios' },
      ]
      prismaMock.permission.findMany.mockResolvedValue(mockPermissions as any)

      const result = await getPermissionsByModule(moduleName)

      expect(prismaMock.permission.findMany).toHaveBeenCalledWith({
        where: { module: moduleName },
        select: {
          id: true,
          module: true,
          description: true,
        },
        orderBy: { id: 'asc' },
      })
      expect(result).toEqual(mockPermissions)
    })

    it('debe retornar un array vacío si el módulo no existe o no tiene permisos', async () => {
      prismaMock.permission.findMany.mockResolvedValue([])
      const result = await getPermissionsByModule('nonexistent-module')
      expect(result).toEqual([])
    })
  })

  describe('permissionExists', () => {
    it('debe retornar true si el permiso existe', async () => {
      const permissionId = 'user:create'
      prismaMock.permission.count.mockResolvedValue(1)

      const result = await permissionExists(permissionId)

      expect(prismaMock.permission.count).toHaveBeenCalledWith({
        where: { id: permissionId },
      })
      expect(result).toBe(true)
    })

    it('debe retornar false si el permiso no existe', async () => {
      const permissionId = 'nonexistent:permission'
      prismaMock.permission.count.mockResolvedValue(0)

      const result = await permissionExists(permissionId)

      expect(result).toBe(false)
    })
  })
})
