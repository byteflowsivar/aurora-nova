/**
 * Configuración Central de Aurora Nova
 *
 * Aurora Nova - Configuration Management
 *
 * Exporta objeto `config` con todas las constantes de configuración
 * de la aplicación. Basado en variables de entorno y decisiones
 * arquitectónicas documentadas en ADRs.
 *
 * **Propósito**:
 * - Centralizar todas las constantes configurables
 * - Single source of truth para valores de configuración
 * - Type-safe con TypeScript `as const`
 * - Fácil acceso desde cualquier módulo sin reimportarenv
 *
 * **Secciones**:
 * - `app`: Información de la aplicación (nombre, URL, version)
 * - `database`: Configuración de base de datos PostgreSQL
 * - `auth`: Autenticación (JWT, cookies, password requirements)
 * - `security`: Hashing, login attempts, lockout
 * - `defaultRoles`: Roles predefinidos del sistema
 * - `logging`: Configuración de logs por entorno
 * - `development`: Flags específicos para desarrollo
 * - `routes`: URLs de rutas importantes de la app
 * - `ui`: Configuración UI (tema, paginación)
 *
 * **Validaciones en Tiempo de Carga**:
 * - sessionExpiresIn >= 60000 (1 minuto mínimo)
 * - bcryptRounds >= 10 (10 rounds mínimo para seguridad)
 *
 * @module lib/config
 * @see {@link ./env.ts} para variables de entorno validadas
 * @see {@link ../app/layout.tsx} para uso en aplicación
 *
 * @example
 * ```typescript
 * import { config } from '@/lib/config';
 *
 * // Usar configuración en cualquier lugar
 * console.log(config.app.name);              // "Aurora Nova"
 * console.log(config.auth.sessionExpiresIn); // 86400000 (24 horas)
 * console.log(config.security.bcryptRounds); // 12
 *
 * // En features condicionales
 * if (config.development.enableDebugRoutes) {
 *   // Registrar rutas de debug
 * }
 * ```
 */

import { env } from './env';

/**
 * Objeto de Configuración Global
 *
 * Singleton con toda la configuración de la aplicación.
 * Accesible desde cualquier módulo para obtener valores configurables.
 *
 * @type {const} - Tipos específicos inferidos para máxima type-safety
 *
 * @remarks
 * **Estructura Jerárquica**:
 * ```
 * config
 *   ├── app: Info de aplicación
 *   ├── database: Configuración BD
 *   ├── auth: Autenticación y JWT
 *   ├── security: Hashing y lockout
 *   ├── defaultRoles: Roles del sistema
 *   ├── logging: Configuración logs
 *   ├── development: Flags de dev
 *   ├── routes: URLs de rutas
 *   └── ui: Configuración UI
 * ```
 *
 * **Type Safety**:
 * El `as const` permite TypeScript inferir tipos literales exactos:
 * - `config.auth.sessionExpiresIn` es `24 * 60 * 60 * 1000` (literal)
 * - No solo `number`, sino el valor exacto
 * - Permite optimizaciones del compilador
 *
 * **Acceso Seguro**:
 * ```typescript
 * const appName = config.app.name; // ✓ Type-safe, autocomplete funciona
 * const authSecret = config.auth.secret; // Error: secret no es campo (usa env.AUTH_SECRET)
 * ```
 */
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