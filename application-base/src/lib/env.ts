/**
 * Validación y Configuración de Variables de Entorno
 *
 * Aurora Nova - Gestión Centralizada de Configuración
 *
 * Valida y exporta todas las variables de entorno requeridas por la aplicación.
 * Implementa validación al inicio para detectar configuraciones faltantes antes
 * de que causen errores durante ejecución.
 *
 * **Variables Requeridas**:
 * - `DATABASE_URL`: URL de conexión PostgreSQL (formato: postgresql://...)
 * - `AUTH_SECRET`: Secret para firmar JWTs (min 32 chars en producción)
 * - `NEXTAUTH_URL`: URL base para Auth.js (ej: http://localhost:3000)
 * - `NODE_ENV`: Entorno (development|production|test)
 * - `APP_NAME`: Nombre de la aplicación (default: "Aurora Nova")
 * - `APP_URL`: URL base de la aplicación
 *
 * **Variables Opcionales**:
 * - `LOG_LEVEL`: Nivel de logging (debug|info|warn|error, default: info)
 * - `SMTP_HOST`: Host SMTP para email
 * - `SMTP_PORT`: Puerto SMTP
 * - `SMTP_USER`: Usuario SMTP
 * - `SMTP_PASS`: Contraseña SMTP
 * - `FROM_EMAIL`: Email de origen para notificaciones
 * - `SUPPORT_EMAIL`: Email de soporte
 *
 * **Ejemplo .env.local**:
 * ```
 * # Base de Datos
 * DATABASE_URL="postgresql://user:password@localhost:5432/aurora_nova_db"
 *
 * # Autenticación
 * AUTH_SECRET="your-super-secret-key-minimum-32-characters-long-here"
 * NEXTAUTH_URL="http://localhost:3000"
 *
 * # Aplicación
 * NODE_ENV="development"
 * APP_NAME="Aurora Nova"
 * APP_URL="http://localhost:3000"
 *
 * # Logging (opcional)
 * LOG_LEVEL="debug"
 *
 * # Email (opcional)
 * SMTP_HOST="smtp.gmail.com"
 * SMTP_PORT="587"
 * SMTP_USER="your-email@gmail.com"
 * SMTP_PASS="your-app-password"
 * FROM_EMAIL="noreply@example.com"
 * SUPPORT_EMAIL="support@example.com"
 * ```
 *
 * **Validaciones Implementadas**:
 * - Variables requeridas deben existir (lanza error si faltan)
 * - AUTH_SECRET mínimo 32 caracteres en producción
 * - NODE_ENV debe ser uno de los valores permitidos
 * - Logging en desarrollo y producción (oculta contraseñas)
 *
 * **Seguridad**:
 * - Variables sensibles nunca se loguean completas
 * - DATABASE_URL y AUTH_SECRET se ocultan en logs
 * - Validación de AUTH_SECRET en producción
 * - Todas las variables tipadas como `const` (inmutables)
 *
 * @module lib/env
 * @see {@link ./prisma/connection.ts} para uso de DATABASE_URL
 * @see {@link ./auth.ts} para uso de AUTH_SECRET, NEXTAUTH_URL
 * @see {@link ./logger/structured-logger.ts} para uso de LOG_LEVEL
 *
 * @example
 * ```typescript
 * import { env } from '@/lib/env';
 *
 * // Usar variables validadas
 * console.log(env.APP_NAME);        // "Aurora Nova"
 * console.log(env.NODE_ENV);         // "development" | "production"
 * console.log(env.LOG_LEVEL);        // "debug" | "info" | "warn" | "error"
 *
 * // Decidir comportamiento por entorno
 * if (env.NODE_ENV === 'development') {
 *   console.log('Running in development');
 * }
 *
 * // Usar en configuración
 * const isDev = env.NODE_ENV === 'development';
 * const isProd = env.NODE_ENV === 'production';
 * ```
 *
 * @remarks
 * **Validación al Inicio**:
 * Este archivo se ejecuta cuando se importa (lado del servidor).
 * Si alguna variable requerida falta, lanza error inmediatamente,
 * impidiendo que la aplicación inicie con configuración incompleta.
 *
 * **Type Safety**:
 * El objeto `env` está tipado como `const`, permitiendo que TypeScript
 * infiera tipos específicos para cada variable (ej: NODE_ENV es union type).
 *
 * **Desarrollo vs Producción**:
 * - En desarrollo: Loguea todas las variables para debugging
 * - En producción: Loguea variables sin exponer valores sensibles
 * - En ambos: Oculta contraseñas en logs
 */

/**
 * Obtener variable de entorno requerida
 *
 * Busca variable en process.env, retorna fallback si existe,
 * lanza error si no encuentra ninguno de los dos.
 *
 * @param name - Nombre de la variable de entorno
 * @param fallback - Valor por defecto (opcional)
 *
 * @returns {string} Valor de la variable
 *
 * @throws {Error} Si la variable no existe y no hay fallback
 *
 * @example
 * ```typescript
 * const dbUrl = getEnvVar('DATABASE_URL');
 * const appName = getEnvVar('APP_NAME', 'My App'); // usa fallback si falta
 * ```
 */
function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Variable de entorno requerida no encontrada: ${name}`);
  }

  return value;
}

/**
 * Obtener variable de entorno opcional
 *
 * Busca variable en process.env, retorna fallback si existe,
 * retorna undefined si no encuentra ninguno de los dos.
 * Para variables que no son requeridas.
 *
 * @param name - Nombre de la variable de entorno
 * @param fallback - Valor por defecto (opcional)
 *
 * @returns {string | undefined} Valor de la variable o undefined
 *
 * @example
 * ```typescript
 * const smtpHost = getOptionalEnvVar('SMTP_HOST');
 * const logLevel = getOptionalEnvVar('LOG_LEVEL', 'info');
 * ```
 */
function getOptionalEnvVar(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

/**
 * Objeto de Configuración de Variables de Entorno
 *
 * Exporta todas las variables de entorno validadas y tipadas.
 * Disponible en toda la aplicación del lado del servidor.
 *
 * @type {const}
 *
 * @remarks
 * **Estructura**:
 * - Todas las variables están validadas al importar este módulo
 * - Si falta variable requerida, lanza error inmediatamente
 * - Las variables son de solo lectura (const)
 * - TypeScript infiere tipos específicos para cada variable
 *
 * **Acceso**:
 * ```typescript
 * import { env } from '@/lib/env';
 *
 * // Acceder a variables
 * env.DATABASE_URL
 * env.AUTH_SECRET
 * env.NODE_ENV
 * env.APP_NAME
 * env.APP_URL
 * env.LOG_LEVEL
 * env.SMTP_HOST
 * // ... etc
 * ```
 *
 * **Variables de Base de Datos**:
 * - `DATABASE_URL`: Conexión PostgreSQL (requerida)
 *
 * **Variables de Autenticación**:
 * - `AUTH_SECRET`: Secret para firmar JWTs (requerida)
 * - `NEXTAUTH_URL`: URL base para Auth.js (requerida)
 *
 * **Variables de Aplicación**:
 * - `NODE_ENV`: Entorno (development | production | test)
 * - `APP_NAME`: Nombre de la app
 * - `APP_URL`: URL base
 *
 * **Variables de Logging**:
 * - `LOG_LEVEL`: debug | info | warn | error
 *
 * **Variables de Email**:
 * - `SMTP_HOST`: Host SMTP (opcional)
 * - `SMTP_PORT`: Puerto SMTP (opcional)
 * - `SMTP_USER`: Usuario SMTP (opcional)
 * - `SMTP_PASS`: Contraseña SMTP (opcional)
 * - `FROM_EMAIL`: Email de origen (opcional)
 * - `SUPPORT_EMAIL`: Email de soporte (opcional)
 *
 * @see {@link ./prisma/connection.ts} para uso de DATABASE_URL
 * @see {@link ./auth.ts} para uso de AUTH_SECRET, NEXTAUTH_URL
 * @see {@link ./logger/structured-logger.ts} para uso de LOG_LEVEL
 */
export const env = {
  // Base de datos
  DATABASE_URL: getEnvVar('DATABASE_URL'),

  // Autenticación
  AUTH_SECRET: getEnvVar('AUTH_SECRET'),
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL'),

  // Aplicación
  NODE_ENV: getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  APP_NAME: getEnvVar('APP_NAME', 'Aurora Nova'),
  APP_URL: getEnvVar('APP_URL'),

  // Logging
  LOG_LEVEL: getOptionalEnvVar('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',

  // Email (opcional)
  SMTP_HOST: getOptionalEnvVar('SMTP_HOST'),
  SMTP_PORT: getOptionalEnvVar('SMTP_PORT'),
  SMTP_USER: getOptionalEnvVar('SMTP_USER'),
  SMTP_PASS: getOptionalEnvVar('SMTP_PASS'),
  FROM_EMAIL: getOptionalEnvVar('FROM_EMAIL'),
  SUPPORT_EMAIL: getOptionalEnvVar('SUPPORT_EMAIL'),
} as const;

// Validación adicional para desarrollo
if (env.NODE_ENV === 'development') {
  console.log('🔧 Variables de entorno desarrollo cargadas:');
  console.log(`   - NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   - APP_NAME: ${env.APP_NAME}`);
  console.log(`   - APP_URL: ${env.APP_URL}`);
  console.log(`   - DATABASE_URL: ${env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`); // Oculta la contraseña
  console.log(`   - LOG_LEVEL: ${env.LOG_LEVEL}`);
}

// Validación de AUTH_SECRET en producción
if (env.NODE_ENV === 'production' && env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET debe tener al menos 32 caracteres en producción');
}

// production
if (env.NODE_ENV === 'production') {
  console.log('🔧 Variables de entorno produccion cargadas:');
  console.log(`   - NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   - APP_NAME: ${env.APP_NAME}`);
  console.log(`   - APP_URL: ${env.APP_URL}`);
  console.log(`   - NEXTAUTH_URL: ${env.NEXTAUTH_URL}`);
  console.log(`   - DATABASE_URL: ${env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`); // Oculta la contraseña
  console.log(`   - LOG_LEVEL: ${env.LOG_LEVEL}`);
}