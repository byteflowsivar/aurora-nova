/**
 * Tests unitarios para session-queries
 * T024: Tests de autenticación - Queries de sesión
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock, resetPrismaMock } from '../mocks/prisma'
import { createSession, isSessionValid } from '@/lib/prisma/session-queries'
import type { CreateSessionData } from '@/lib/types/session'

describe('session-queries', () => {
  beforeEach(() => {
    resetPrismaMock()
  })

  describe('createSession', () => {
    it('debe crear una sesión correctamente con todos los datos', async () => {
      const sessionData: CreateSessionData = {
        sessionToken: 'test-token-123',
        userId: 'user-id-123',
        expires: new Date('2024-12-31'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      }

      const expectedSession = {
        id: 'session-id-123',
        ...sessionData,
        createdAt: new Date('2024-01-01'),
      }

      prismaMock.session.create.mockResolvedValue(expectedSession as any)

      const result = await createSession(sessionData)

      expect(prismaMock.session.create).toHaveBeenCalledWith({
        data: {
          sessionToken: sessionData.sessionToken,
          userId: sessionData.userId,
          expires: sessionData.expires,
          ipAddress: sessionData.ipAddress,
          userAgent: sessionData.userAgent,
        },
      })

      expect(result).toEqual(expectedSession)
    })

    it('debe crear una sesión sin ipAddress y userAgent', async () => {
      const sessionData: CreateSessionData = {
        sessionToken: 'test-token-456',
        userId: 'user-id-456',
        expires: new Date('2024-12-31'),
      }

      const expectedSession = {
        id: 'session-id-456',
        sessionToken: sessionData.sessionToken,
        userId: sessionData.userId,
        expires: sessionData.expires,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date('2024-01-01'),
      }

      prismaMock.session.create.mockResolvedValue(expectedSession as any)

      const result = await createSession(sessionData)

      expect(prismaMock.session.create).toHaveBeenCalledWith({
        data: {
          sessionToken: sessionData.sessionToken,
          userId: sessionData.userId,
          expires: sessionData.expires,
          ipAddress: null,
          userAgent: null,
        },
      })

      expect(result.ipAddress).toBeNull()
      expect(result.userAgent).toBeNull()
    })

    it('debe manejar errores de base de datos', async () => {
      const sessionData: CreateSessionData = {
        sessionToken: 'test-token-error',
        userId: 'user-id-error',
        expires: new Date('2024-12-31'),
      }

      prismaMock.session.create.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(createSession(sessionData)).rejects.toThrow(
        'Database connection failed'
      )
    })
  })

  describe('isSessionValid', () => {
    it('debe retornar true para una sesión válida no expirada', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // +1 día

      prismaMock.session.findUnique.mockResolvedValue({
        expires: futureDate,
      } as any)

      const result = await isSessionValid('valid-token')

      expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
        where: { sessionToken: 'valid-token' },
        select: { expires: true },
      })

      expect(result).toBe(true)
    })

    it('debe retornar false para una sesión expirada', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // -1 día

      prismaMock.session.findUnique.mockResolvedValue({
        expires: pastDate,
      } as any)

      const result = await isSessionValid('expired-token')

      expect(result).toBe(false)
    })

    it('debe retornar false si la sesión no existe', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null)

      const result = await isSessionValid('nonexistent-token')

      expect(result).toBe(false)
    })

    it('debe manejar errores de base de datos', async () => {
      prismaMock.session.findUnique.mockRejectedValue(
        new Error('Database error')
      )

      await expect(isSessionValid('error-token')).rejects.toThrow(
        'Database error'
      )
    })
  })
})
