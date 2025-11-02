/**
 * Tests unitarios para session-utils
 * T024: Tests de autenticación - Utilidades de sesión
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateSessionToken,
  parseUserAgent,
  getSessionExpiry,
} from '@/lib/utils/session-utils'

describe('session-utils', () => {
  describe('generateSessionToken', () => {
    it('debe generar un token de sesión válido', () => {
      const token = generateSessionToken()

      // Verificar que es un string
      expect(typeof token).toBe('string')

      // Verificar que no está vacío
      expect(token.length).toBeGreaterThan(0)

      // Verificar formato UUID v4 (8-4-4-4-12)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(token).toMatch(uuidRegex)
    })

    it('debe generar tokens únicos', () => {
      const token1 = generateSessionToken()
      const token2 = generateSessionToken()

      expect(token1).not.toBe(token2)
    })

    it('debe generar múltiples tokens únicos', () => {
      const tokens = new Set()
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        tokens.add(generateSessionToken())
      }

      // Todos los tokens deben ser únicos
      expect(tokens.size).toBe(iterations)
    })
  })

  describe('parseUserAgent', () => {
    it('debe detectar Chrome correctamente', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Chrome')
      expect(result.os).toBe('Windows')
      expect(result.device).toBe('Desktop')
    })

    it('debe detectar Firefox correctamente', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Firefox')
      expect(result.os).toBe('Windows')
      expect(result.device).toBe('Desktop')
    })

    it('debe detectar Safari correctamente', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Safari')
      expect(result.os).toBe('macOS')
      expect(result.device).toBe('Desktop')
    })

    it('debe detectar Edge correctamente', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Edge')
      expect(result.os).toBe('Windows')
      expect(result.device).toBe('Desktop')
    })

    it('debe detectar dispositivos móviles Android', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Chrome')
      expect(result.os).toBe('Android')
      expect(result.device).toBe('Mobile')
    })

    it('debe detectar dispositivos iOS', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Safari')
      expect(result.os).toBe('iOS')
      expect(result.device).toBe('Mobile')
    })

    it('debe detectar tablets iPad', () => {
      const ua =
        'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Safari')
      expect(result.os).toBe('iOS')
      expect(result.device).toBe('Tablet')
    })

    it('debe detectar Linux Desktop', () => {
      const ua =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      const result = parseUserAgent(ua)

      expect(result.browser).toBe('Chrome')
      expect(result.os).toBe('Linux')
      expect(result.device).toBe('Desktop')
    })

    it('debe manejar User-Agent vacío', () => {
      const result = parseUserAgent('')

      expect(result.browser).toBeUndefined()
      expect(result.os).toBeUndefined()
      expect(result.device).toBe('Desktop') // Default
    })

    it('debe ser case-insensitive', () => {
      const ua1 = 'Mozilla/5.0 (WINDOWS NT 10.0) CHROME/91.0'
      const ua2 = 'mozilla/5.0 (windows nt 10.0) chrome/91.0'

      const result1 = parseUserAgent(ua1)
      const result2 = parseUserAgent(ua2)

      expect(result1).toEqual(result2)
    })
  })

  describe('getSessionExpiry', () => {
    beforeEach(() => {
      // Mock Date.now() para tener resultados consistentes
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('debe calcular fecha de expiración por defecto (30 días)', () => {
      const expiry = getSessionExpiry()

      const expectedDate = new Date('2024-01-31T00:00:00.000Z')
      expect(expiry.getTime()).toBe(expectedDate.getTime())
    })

    it('debe calcular fecha de expiración con maxAge personalizado (7 días)', () => {
      const sevenDaysInSeconds = 7 * 24 * 60 * 60
      const expiry = getSessionExpiry(sevenDaysInSeconds)

      const expectedDate = new Date('2024-01-08T00:00:00.000Z')
      expect(expiry.getTime()).toBe(expectedDate.getTime())
    })

    it('debe calcular fecha de expiración con maxAge de 1 hora', () => {
      const oneHourInSeconds = 60 * 60
      const expiry = getSessionExpiry(oneHourInSeconds)

      const expectedDate = new Date('2024-01-01T01:00:00.000Z')
      expect(expiry.getTime()).toBe(expectedDate.getTime())
    })

    it('debe calcular fecha de expiración con maxAge de 1 minuto', () => {
      const oneMinuteInSeconds = 60
      const expiry = getSessionExpiry(oneMinuteInSeconds)

      const expectedDate = new Date('2024-01-01T00:01:00.000Z')
      expect(expiry.getTime()).toBe(expectedDate.getTime())
    })

    it('debe manejar maxAge de 0 correctamente', () => {
      const expiry = getSessionExpiry(0)

      const expectedDate = new Date('2024-01-01T00:00:00.000Z')
      expect(expiry.getTime()).toBe(expectedDate.getTime())
    })

    it('debe retornar un objeto Date válido', () => {
      const expiry = getSessionExpiry()

      expect(expiry).toBeInstanceOf(Date)
      expect(isNaN(expiry.getTime())).toBe(false)
    })

    it('la fecha de expiración debe ser posterior a la fecha actual', () => {
      const now = new Date()
      const expiry = getSessionExpiry(3600) // 1 hora

      expect(expiry.getTime()).toBeGreaterThan(now.getTime())
    })
  })
})
