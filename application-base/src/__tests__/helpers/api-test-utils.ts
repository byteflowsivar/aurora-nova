/**
 * Utilidades para testing de API routes en Next.js 15
 * Helpers para crear requests y mockear contexto de Auth.js
 */

import { NextRequest } from 'next/server'
import { vi } from 'vitest'
import type { Session } from '@auth/core'

/**
 * Crea un NextRequest mock para testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options

  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return request
}

/**
 * Mock de sesión de usuario autenticado
 */
export const mockAuthenticatedUser = {
  user: {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
    emailVerified: null,
    firstName: 'Test',
    lastName: 'User',
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

/**
 * Mock de sesión de administrador
 */
export const mockAdminUser = {
  user: {
    id: 'admin-user-123',
    name: 'Admin User',
    email: 'admin@example.com',
    image: null,
    emailVerified: new Date(),
    firstName: 'Admin',
    lastName: 'User',
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}

/**
 * Mock de auth() que retorna usuario autenticado
 */
export function mockAuthSession(session: Session | null = mockAuthenticatedUser) {
  return vi.fn().mockResolvedValue(session)
}

/**
 * Mock de auth() que retorna null (no autenticado)
 */
export function mockNoAuthSession() {
  return vi.fn().mockResolvedValue(null)
}

/**
 * Extrae JSON de una Response
 */
export async function getResponseJson(response: Response) {
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

/**
 * Verifica que una respuesta tenga el status code esperado
 */
export function expectStatus(response: Response, status: number) {
  if (response.status !== status) {
    throw new Error(
      `Expected status ${status}, got ${response.status}`
    )
  }
}

/**
 * Mock de parámetros de ruta dinámica para Next.js 15
 * En Next.js 15, params es una Promise
 */
export function createMockParams(params: Record<string, string>) {
  return Promise.resolve(params)
}
