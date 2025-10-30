/**
 * Exportaciones principales de la base de datos
 * Punto de entrada único para Drizzle ORM en Aurora Nova
 */

// Conexión principal
export { db, testConnection, verifyPostgreSQLVersion, closeConnection } from './connection';

// Esquemas y tipos
export * from './schema';

// Queries comunes
export * from './queries';

// Re-exportar utilidades de Drizzle más usadas
export { eq, and, or, not, isNull, isNotNull, desc, asc, sql } from 'drizzle-orm';
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';