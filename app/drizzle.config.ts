/**
 * Configuración de Drizzle Kit para Aurora Nova
 * Compatible con PostgreSQL 18+ y variables de entorno
 */

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

export default defineConfig({
  // Archivos de esquema
  schema: './src/lib/db/schema.ts',

  // Directorio de migraciones
  out: './drizzle',

  // Configuración de la base de datos
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Configuraciones adicionales
  verbose: true,  // Logs detallados
  strict: true,   // Validaciones estrictas

  // Configuración específica para PostgreSQL
  schemaFilter: ['public'], // Solo esquema public

  // Configuración de introspección
  introspect: {
    casing: 'camel', // Convertir snake_case a camelCase
  },

  // Configuración de migración
  migrations: {
    prefix: 'timestamp', // Prefijo de timestamp para migraciones
    table: '__drizzle_migrations__', // Tabla de control de migraciones
    schema: 'public',
  },
});