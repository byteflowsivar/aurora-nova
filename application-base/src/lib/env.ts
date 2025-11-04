/**
 * Validación y configuración de variables de entorno
 * Este archivo centraliza la validación de todas las variables de entorno requeridas
 */

function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Variable de entorno requerida no encontrada: ${name}`);
  }

  return value;
}

function getOptionalEnvVar(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

// Validación y exportación de variables de entorno
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