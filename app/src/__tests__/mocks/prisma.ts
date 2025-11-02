/**
 * Mock de Prisma Client para testing
 * Evita llamadas reales a la base de datos
 */

import { vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended'

// Crear un mock profundo de PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>

// Mock del módulo de conexión de Prisma
vi.mock('@/lib/prisma/connection', () => ({
  prisma: prismaMock,
}))

/**
 * Helper para resetear todos los mocks de Prisma
 */
export function resetPrismaMock() {
  vi.clearAllMocks()
}
