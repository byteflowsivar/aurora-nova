/**
 * Conexión Singleton de Prisma Client
 *
 * Aurora Nova - ORM de Base de Datos PostgreSQL
 *
 * Proporciona una instancia singleton de PrismaClient configurada para
 * desarrollo y producción. Maneja la conexión a PostgreSQL con
 * optimizaciones de rendimiento y logging diferenciado.
 *
 * **Singleton Pattern**:
 * - Una única instancia de PrismaClient durante toda la aplicación
 * - Usa `globalThis` para persistir en hot reload de desarrollo
 * - Previene multiple conexiones innecesarias a BD
 * - Shared connection pool en producción
 *
 * **Configuración por Entorno**:
 * - **Desarrollo**: Logging de queries para debugging (query, error, warn)
 * - **Producción**: Solo logging de errores (no queries por performance)
 *
 * **Características**:
 * - Conexión automática en importación
 * - Lazy loading (conexión se abre al primer uso)
 * - Connection pooling automático de PostgreSQL
 * - Reconnection automática en caso de timeout
 * - Tipos generados automáticamente por Prisma
 *
 * **Uso**:
 * ```typescript
 * import { prisma } from '@/lib/prisma/connection';
 *
 * // Queries a la BD
 * const user = await prisma.user.findUnique({ where: { id: 'user-123' } });
 * const users = await prisma.user.findMany({ where: { role: 'admin' } });
 *
 * // Transacciones
 * await prisma.$transaction(async (tx) => {
 *   await tx.user.update({ where: { id: 'user-123' }, data: { name: 'John' } });
 *   await tx.audit.create({ data: { ... } });
 * });
 *
 * // Disconnect (típicamente solo en tests)
 * await prisma.$disconnect();
 * ```
 *
 * **Schema de BD**:
 * El schema está definido en `prisma/schema.prisma` e incluye:
 * - User (usuarios del sistema)
 * - Role (roles con permisos)
 * - Permission (permisos del sistema)
 * - UserRole (relación user-role)
 * - RolePermission (relación role-permission)
 * - Session (sesiones activas)
 * - AuditLog (registro de auditoría)
 * - Y más...
 *
 * **Performance Tips**:
 * - Usar `select` para traer solo campos necesarios
 * - Usar `include` para relaciones, no queries separadas
 * - Usar transacciones para múltiples cambios
 * - Usar índices en búsquedas frecuentes
 * - Paginación para listas grandes (take + skip)
 *
 * **Migraciones**:
 * ```bash
 * # Ver estado de migraciones
 * npx prisma migrate status
 *
 * # Crear y ejecutar nueva migración
 * npx prisma migrate dev --name name_of_migration
 *
 * # Push schema sin crear migration (dev solamente)
 * npx prisma db push
 *
 * # Generar tipos sin cambiar BD
 * npx prisma generate
 * ```
 *
 * @module lib/prisma/connection
 * @see {@link ../prisma/schema.prisma} para definición del schema
 * @see {@link ../prisma/types.ts} para tipos Prisma generados
 * @see {@link ../prisma/queries.ts} para funciones de query
 * @see https://www.prisma.io/docs para documentación de Prisma
 *
 * @example
 * ```typescript
 * // Importar el singleton
 * import { prisma } from '@/lib/prisma/connection';
 * // o
 * import prisma from '@/lib/prisma/connection';
 *
 * // Usar en queries
 * const user = await prisma.user.findUnique({
 *   where: { id: 'user-123' },
 *   include: { userRoles: { include: { role: true } } }
 * });
 *
 * // Usar en transacciones
 * const result = await prisma.$transaction(async (tx) => {
 *   const newUser = await tx.user.create({
 *     data: { email, name, firstName, lastName }
 *   });
 *   await tx.audit.create({
 *     data: { userId: newUser.id, action: 'USER_CREATED' }
 *   });
 *   return newUser;
 * });
 * ```
 *
 * @remarks
 * **Variables de Entorno Requeridas**:
 * - `DATABASE_URL`: URL de conexión PostgreSQL
 *   (ej: postgresql://user:password@localhost:5432/aurora_nova_db)
 *
 * **Desconexión**:
 * NO es necesario desconectar en aplicaciones Node.js típicas.
 * Solo en casos especiales como tests o scripts CLI:
 * ```typescript
 * // Al terminar (tests, scripts)
 * await prisma.$disconnect();
 * ```
 */

import { PrismaClient } from './generated'

const globalForPrisma = globalThis as unknown as {
  /**
   * Instancia singleton de PrismaClient almacenada en globalThis
   * para persistir durante hot reload en desarrollo
   */
  prisma: PrismaClient | undefined
}

/**
 * Instancia Singleton de PrismaClient
 *
 * Proporciona acceso a la base de datos PostgreSQL a través de Prisma ORM.
 * Es la única instancia que debe usarse en toda la aplicación.
 *
 * @type {PrismaClient}
 *
 * @remarks
 * **Singleton Implementation**:
 * - Verifica si ya existe instancia en `globalThis.prisma`
 * - Si existe, reutiliza la instancia (importante para hot reload)
 * - Si no existe, crea nueva PrismaClient
 * - En desarrollo (no producción), guarda en globalThis para hot reload
 *
 * **Logging Configuration**:
 * - **Development**: Loguea queries, errores, warnings (para debugging)
 * - **Production**: Solo loguea errores (sin queries por performance)
 *
 * **Métodos Principales**:
 * - `.user.findUnique()`, `.user.findMany()`: Queries
 * - `.user.create()`, `.user.update()`, `.user.delete()`: Mutations
 * - `.$transaction()`: Ejecutar múltiples queries de forma atómica
 * - `.$disconnect()`: Cerrar conexión (solo en tests)
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma/connection';
 *
 * // Find
 * const user = await prisma.user.findUnique({
 *   where: { id: 'user-123' }
 * });
 *
 * // Find many with filter
 * const admins = await prisma.user.findMany({
 *   where: { roles: { some: { role: { name: 'admin' } } } }
 * });
 *
 * // Create
 * const newUser = await prisma.user.create({
 *   data: { email: 'user@example.com', name: 'John Doe' }
 * });
 *
 * // Update
 * await prisma.user.update({
 *   where: { id: 'user-123' },
 *   data: { name: 'Jane Doe' }
 * });
 *
 * // Delete
 * await prisma.user.delete({
 *   where: { id: 'user-123' }
 * });
 *
 * // Transaction
 * await prisma.$transaction(async (tx) => {
 *   const user = await tx.user.create({ data: {...} });
 *   await tx.auditLog.create({ data: {...} });
 * });
 * ```
 *
 * @see {@link PrismaClient} para documentación de PrismaClient
 * @see https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client para referencia
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Guardar en globalThis durante desarrollo para persistir en hot reload
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Alias default para la instancia de PrismaClient
 *
 * Permite importar como:
 * ```typescript
 * import prisma from '@/lib/prisma/connection';
 * ```
 *
 * En lugar de:
 * ```typescript
 * import { prisma } from '@/lib/prisma/connection';
 * ```
 *
 * @type {PrismaClient}
 * @see {@link prisma} para documentación
 */
export default prisma