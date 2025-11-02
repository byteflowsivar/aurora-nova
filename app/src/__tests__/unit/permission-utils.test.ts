/**
 * Tests unitarios para permission-utils
 * T025: Tests de autorización - Utilidades de permisos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hasPermission,
  hasPermissions,
  hasAnyPermission,
  hasAllPermissions,
  getPermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
} from '@/lib/utils/permission-utils'

// Mock del módulo de permission-queries
vi.mock('@/lib/prisma/permission-queries', () => ({
  getUserPermissions: vi.fn(),
  userHasPermission: vi.fn(),
  userHasAnyPermission: vi.fn(),
  userHasAllPermissions: vi.fn(),
}))

import * as permissionQueries from '@/lib/prisma/permission-queries'

describe('permission-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Server-side utilities', () => {
    describe('hasPermission', () => {
      it('debe llamar a userHasPermission y retornar el resultado', async () => {
        const userId = 'user-123'
        const permission = 'user:create'

        vi.mocked(permissionQueries.userHasPermission).mockResolvedValue(true)

        const result = await hasPermission(userId, permission)

        expect(permissionQueries.userHasPermission).toHaveBeenCalledWith(
          userId,
          permission
        )
        expect(result).toBe(true)
      })

      it('debe retornar false cuando el usuario no tiene el permiso', async () => {
        vi.mocked(permissionQueries.userHasPermission).mockResolvedValue(false)

        const result = await hasPermission('user-123', 'admin:super')

        expect(result).toBe(false)
      })
    })

    describe('hasPermissions', () => {
      it('debe verificar TODOS los permisos por defecto (requireAll: true)', async () => {
        const userId = 'user-123'
        const permissions = ['user:create', 'user:update']

        vi.mocked(permissionQueries.userHasAllPermissions).mockResolvedValue({
          hasPermission: true,
        })

        const result = await hasPermissions(userId, permissions)

        expect(permissionQueries.userHasAllPermissions).toHaveBeenCalledWith(
          userId,
          permissions
        )
        expect(result.hasPermission).toBe(true)
      })

      it('debe verificar TODOS los permisos cuando requireAll es true', async () => {
        const userId = 'user-123'
        const permissions = ['user:create', 'user:delete']

        vi.mocked(permissionQueries.userHasAllPermissions).mockResolvedValue({
          hasPermission: false,
          missingPermissions: ['user:delete'],
        })

        const result = await hasPermissions(userId, permissions, {
          requireAll: true,
        })

        expect(result).toEqual({
          hasPermission: false,
          missingPermissions: ['user:delete'],
        })
      })

      it('debe verificar AL MENOS UNO cuando requireAll es false', async () => {
        const userId = 'user-123'
        const permissions = ['user:create', 'user:update']

        vi.mocked(permissionQueries.userHasAnyPermission).mockResolvedValue(true)

        const result = await hasPermissions(userId, permissions, {
          requireAll: false,
        })

        expect(permissionQueries.userHasAnyPermission).toHaveBeenCalledWith(
          userId,
          permissions
        )
        expect(result.hasPermission).toBe(true)
      })
    })

    describe('hasAnyPermission', () => {
      it('debe llamar a userHasAnyPermission', async () => {
        const userId = 'user-123'
        const permissions = ['user:create', 'user:update', 'user:delete']

        vi.mocked(permissionQueries.userHasAnyPermission).mockResolvedValue(true)

        const result = await hasAnyPermission(userId, permissions)

        expect(permissionQueries.userHasAnyPermission).toHaveBeenCalledWith(
          userId,
          permissions
        )
        expect(result).toBe(true)
      })
    })

    describe('hasAllPermissions', () => {
      it('debe llamar a userHasAllPermissions', async () => {
        const userId = 'user-123'
        const permissions = ['user:create', 'user:read']

        vi.mocked(permissionQueries.userHasAllPermissions).mockResolvedValue({
          hasPermission: true,
        })

        const result = await hasAllPermissions(userId, permissions)

        expect(permissionQueries.userHasAllPermissions).toHaveBeenCalledWith(
          userId,
          permissions
        )
        expect(result.hasPermission).toBe(true)
      })
    })

    describe('getPermissions', () => {
      it('debe llamar a getUserPermissions', async () => {
        const userId = 'user-123'
        const mockPermissions = ['user:create', 'user:read', 'role:manage']

        vi.mocked(permissionQueries.getUserPermissions).mockResolvedValue(
          mockPermissions
        )

        const result = await getPermissions(userId)

        expect(permissionQueries.getUserPermissions).toHaveBeenCalledWith(userId)
        expect(result).toEqual(mockPermissions)
      })
    })
  })

  describe('Client-side utilities (synchronous)', () => {
    describe('checkPermission', () => {
      it('debe retornar true si el permiso está en el array', () => {
        const userPermissions = ['user:create', 'user:read', 'role:manage']
        const permission = 'user:create'

        const result = checkPermission(userPermissions, permission)

        expect(result).toBe(true)
      })

      it('debe retornar false si el permiso no está en el array', () => {
        const userPermissions = ['user:read']
        const permission = 'admin:super'

        const result = checkPermission(userPermissions, permission)

        expect(result).toBe(false)
      })

      it('debe retornar false si el array está vacío', () => {
        const result = checkPermission([], 'user:create')

        expect(result).toBe(false)
      })

      it('debe ser case-sensitive', () => {
        const userPermissions = ['user:create']

        expect(checkPermission(userPermissions, 'user:create')).toBe(true)
        expect(checkPermission(userPermissions, 'USER:CREATE')).toBe(false)
      })
    })

    describe('checkAnyPermission', () => {
      it('debe retornar true si el usuario tiene al menos uno de los permisos', () => {
        const userPermissions = ['user:create', 'user:read']
        const permissions = ['user:create', 'user:update', 'user:delete']

        const result = checkAnyPermission(userPermissions, permissions)

        expect(result).toBe(true)
      })

      it('debe retornar false si el usuario no tiene ninguno de los permisos', () => {
        const userPermissions = ['user:read']
        const permissions = ['admin:super', 'system:config']

        const result = checkAnyPermission(userPermissions, permissions)

        expect(result).toBe(false)
      })

      it('debe retornar false si el array de permisos a verificar está vacío', () => {
        const userPermissions = ['user:create']

        const result = checkAnyPermission(userPermissions, [])

        expect(result).toBe(false)
      })

      it('debe retornar false si el usuario no tiene permisos', () => {
        const result = checkAnyPermission([], ['user:create', 'user:read'])

        expect(result).toBe(false)
      })

      it('debe retornar true si el usuario tiene múltiples de los permisos solicitados', () => {
        const userPermissions = [
          'user:create',
          'user:read',
          'user:update',
          'user:delete',
        ]
        const permissions = ['user:update', 'user:delete']

        const result = checkAnyPermission(userPermissions, permissions)

        expect(result).toBe(true)
      })
    })

    describe('checkAllPermissions', () => {
      it('debe retornar hasPermission: true si el usuario tiene todos los permisos', () => {
        const userPermissions = ['user:create', 'user:read', 'user:update']
        const permissions = ['user:create', 'user:read']

        const result = checkAllPermissions(userPermissions, permissions)

        expect(result).toEqual({
          hasPermission: true,
          missingPermissions: undefined,
        })
      })

      it('debe retornar hasPermission: false y listar permisos faltantes', () => {
        const userPermissions = ['user:read']
        const permissions = ['user:create', 'user:update', 'user:delete']

        const result = checkAllPermissions(userPermissions, permissions)

        expect(result).toEqual({
          hasPermission: false,
          missingPermissions: ['user:create', 'user:update', 'user:delete'],
        })
      })

      it('debe retornar hasPermission: true si el array de permisos a verificar está vacío', () => {
        const userPermissions = ['user:create']

        const result = checkAllPermissions(userPermissions, [])

        expect(result).toEqual({
          hasPermission: true,
          missingPermissions: undefined,
        })
      })

      it('debe retornar todos los permisos como faltantes si el usuario no tiene ninguno', () => {
        const permissions = ['admin:super', 'system:config']

        const result = checkAllPermissions([], permissions)

        expect(result).toEqual({
          hasPermission: false,
          missingPermissions: permissions,
        })
      })

      it('debe identificar correctamente permisos faltantes parciales', () => {
        const userPermissions = ['user:create', 'user:read']
        const permissions = ['user:create', 'user:read', 'user:delete']

        const result = checkAllPermissions(userPermissions, permissions)

        expect(result).toEqual({
          hasPermission: false,
          missingPermissions: ['user:delete'],
        })
      })
    })
  })

  describe('Edge cases', () => {
    it('checkPermission debe manejar permisos con caracteres especiales', () => {
      const userPermissions = ['user:create', 'app:config:advanced']

      expect(checkPermission(userPermissions, 'app:config:advanced')).toBe(true)
    })

    it('checkAnyPermission debe funcionar con un solo permiso en el array', () => {
      const userPermissions = ['user:create']
      const permissions = ['user:create']

      const result = checkAnyPermission(userPermissions, permissions)

      expect(result).toBe(true)
    })

    it('checkAllPermissions debe funcionar cuando el usuario tiene exactamente los permisos requeridos', () => {
      const userPermissions = ['user:create', 'user:read']
      const permissions = ['user:create', 'user:read']

      const result = checkAllPermissions(userPermissions, permissions)

      expect(result.hasPermission).toBe(true)
      expect(result.missingPermissions).toBeUndefined()
    })
  })
})
