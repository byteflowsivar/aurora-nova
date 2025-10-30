/**
 * Configuración de conexión a PostgreSQL con Drizzle ORM
 * Compatible con PostgreSQL 18+ y funciones nativas uuidv7()
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Función para obtener DATABASE_URL
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno');
  }
  return url;
}

// Pool de conexiones lazy
let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: getDatabaseUrl(),
      // Configuraciones optimizadas para desarrollo
      max: 20,          // Máximo 20 conexiones
      min: 5,           // Mínimo 5 conexiones
      idleTimeoutMillis: 30000,  // 30 segundos timeout
      connectionTimeoutMillis: 2000, // 2 segundos para conectar
    });
  }
  return _pool;
}

// Instancia de Drizzle con el pool (lazy)
export const db: ReturnType<typeof drizzle> = new Proxy({} as any, {
  get(target, prop) {
    if (!_db) {
      _db = drizzle(getPool());
    }
    return (_db as any)[prop];
  }
});

// Función para verificar la conexión
export async function testConnection(): Promise<boolean> {
  try {
    const result = await getPool().query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a PostgreSQL:', error);
    return false;
  }
}

// Función para verificar PostgreSQL 18+ y uuidv7()
export async function verifyPostgreSQLVersion(): Promise<boolean> {
  try {
    const pool = getPool();
    // Verificar versión de PostgreSQL
    const versionResult = await pool.query('SELECT version()');
    const version = versionResult.rows[0].version;
    console.log('📋 Versión PostgreSQL:', version);

    // Verificar función uuidv7()
    const uuidResult = await pool.query('SELECT uuidv7() as uuid');
    const uuid = uuidResult.rows[0].uuid;
    console.log('🆔 UUID v7 generado:', uuid);

    return true;
  } catch (error) {
    console.error('❌ Error verificando PostgreSQL 18+ o uuidv7():', error);
    return false;
  }
}

// Función para cerrar conexiones (útil en testing)
export async function closeConnection(): Promise<void> {
  if (_pool) {
    await _pool.end();
    console.log('🔌 Pool de conexiones cerrado');
  }
}

// Exportar función para obtener el pool si se necesita
export { getPool as pool };

// Log de inicialización se hace en las funciones de test/verificación