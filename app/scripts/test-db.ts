/**
 * Script para probar la configuración de Prisma ORM
 * Verifica conexión, esquemas y queries básicas
 */

import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma/connection';
import { getSystemStats } from '../src/lib/prisma/queries';

async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a PostgreSQL exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return false;
  }
}

async function verifyPostgreSQLVersion(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
    const version = result[0].version;
    console.log(`📌 ${version}`);

    // Verificar uuidv7()
    const uuidResult = await prisma.$queryRaw<[{ uuid: string }]>`SELECT uuidv7() as uuid`;
    const uuid = uuidResult[0].uuid;
    console.log(`🔑 UUID v7 generado: ${uuid}`);

    // Verificar que es un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uuid)) {
      console.log('✅ uuidv7() funciona correctamente');
      return true;
    } else {
      console.error('❌ uuidv7() no genera UUIDs válidos');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando PostgreSQL/uuidv7():', error);
    return false;
  }
}

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
    console.log('🎯 Prisma ORM está configurado correctamente');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
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