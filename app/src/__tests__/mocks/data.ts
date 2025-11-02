/**
 * Mock data para tests
 * Datos de prueba reutilizables
 */

import type { User, Role, Permission } from '@prisma/client'

/**
 * Usuario de prueba básico
 */
export const mockUser: User = {
  id: 'test-user-id-123',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  emailVerified: null,
  image: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Rol de prueba
 */
export const mockRole: Role = {
  id: 'test-role-id-123',
  name: 'Test Role',
  description: 'Role for testing',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Permiso de prueba
 */
export const mockPermission: Permission = {
  id: 'test-permission-id-123',
  module: 'user:read',
  description: 'Permission to read users',
  createdAt: new Date('2024-01-01'),
}

/**
 * Admin user para tests de autorización
 */
export const mockAdminUser: User = {
  id: 'admin-user-id-123',
  name: 'Admin User',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  emailVerified: new Date('2024-01-01'),
  image: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Sesión de prueba
 */
export const mockSession = {
  user: {
    id: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
    image: mockUser.image,
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
}

/**
 * Credenciales de prueba
 */
export const mockCredentials = {
  email: 'test@example.com',
  password: 'Test123456!',
}

/**
 * Hash de contraseña de prueba (para 'Test123456!')
 * Generado con bcrypt, factor 12
 */
export const mockPasswordHash =
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyV3hL7.Tj2m'
