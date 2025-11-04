/**
 * Configuración central de la aplicación
 * Basado en las decisiones arquitectónicas documentadas en ADRs
 */

import { env } from './env';

export const config = {
  // Información de la aplicación
  app: {
    name: env.APP_NAME,
    url: env.APP_URL,
    version: '1.0.0',
    description: 'Sistema de gestión de usuarios, roles y permisos',
  },

  // Configuración de base de datos
  database: {
    url: env.DATABASE_URL,
    // Configuraciones específicas de PostgreSQL se manejarán en el ORM
  },

  // Configuración de autenticación
  auth: {
    secret: env.AUTH_SECRET,
    sessionCookieName: 'aurora-session',
    sessionExpiresIn: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
  },

  // Configuración de seguridad
  security: {
    bcryptRounds: 12, // Para hashing de contraseñas
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutos en milisegundos
  },

  // Configuración de roles predeterminados
  defaultRoles: {
    SUPER_ADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    USER: 'Usuario',
  },

  // Configuración de logging
  logging: {
    level: env.LOG_LEVEL,
    enableConsole: env.NODE_ENV === 'development',
    enableFile: env.NODE_ENV === 'production',
  },

  // Configuración de desarrollo
  development: {
    enableDebugRoutes: env.NODE_ENV === 'development',
    showDetailedErrors: env.NODE_ENV === 'development',
    skipEmailVerification: env.NODE_ENV === 'development',
  },

  // URLs importantes de la aplicación
  routes: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      profile: '/auth/profile',
    },
    dashboard: '/dashboard',
    admin: {
      users: '/admin/users',
      roles: '/admin/roles',
      permissions: '/admin/permissions',
    },
  },

  // Configuración de UI según ADR-001
  ui: {
    theme: 'blue', // Tema de shadcn/ui según ADR-001
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;

// Validaciones de configuración en tiempo de ejecución
if (config.auth.sessionExpiresIn < 60000) { // Menos de 1 minuto
  throw new Error('La duración de sesión debe ser de al menos 1 minuto');
}

if (config.security.bcryptRounds < 10) {
  throw new Error('Los rounds de bcrypt deben ser al menos 10 para seguridad');
}

// Exportar tipos derivados
export type AppRoute = typeof config.routes[keyof typeof config.routes];
export type DefaultRole = keyof typeof config.defaultRoles;