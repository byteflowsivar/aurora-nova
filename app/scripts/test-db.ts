/**
 * Script para probar la configuración de Drizzle ORM
 * Verifica conexión, esquemas y queries básicas
 */

import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

import { testConnection, verifyPostgreSQLVersion, getSystemStats } from '../src/lib/db';

async function testDatabase() {
  console.log('🧪 Iniciando pruebas de base de datos...\n');

  try {
    // 1. Probar conexión
    console.log('1️⃣ Probando conexión...');
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // 2. Verificar PostgreSQL 18+ y uuidv7()
    console.log('\n2️⃣ Verificando PostgreSQL 18+ y uuidv7()...');
    const versionOk = await verifyPostgreSQLVersion();
    if (!versionOk) {
      throw new Error('PostgreSQL 18+ o uuidv7() no disponible');
    }

    // 3. Obtener estadísticas del sistema
    console.log('\n3️⃣ Obteniendo estadísticas del sistema...');
    const stats = await getSystemStats();
    console.log('📊 Estadísticas actuales:');
    console.log(`   - Usuarios: ${stats.users}`);
    console.log(`   - Roles: ${stats.roles}`);
    console.log(`   - Permisos: ${stats.permissions}`);
    console.log(`   - Sesiones activas: ${stats.activeSessions}`);

    console.log('\n✅ Todas las pruebas pasaron exitosamente!');
    console.log('🎯 Drizzle ORM está configurado correctamente');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  testDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { testDatabase };