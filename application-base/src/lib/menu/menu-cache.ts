/**
 * Cache de Menú Dinámico para Aurora Nova
 *
 * Aurora Nova - Menu Caching System
 *
 * Sistema de caching in-memory para menú dinámico generado por roles/permisos.
 * Mejora significativamente performance evitando queries DB repetidas.
 *
 * **Propósito**:
 * - Cache en-memory del menú por usuario
 * - TTL automático (5 minutos por defecto)
 * - Invalidación manual cuando cambia RBAC
 * - Mejora UX: menú carga instantáneamente
 *
 * **Flujo**:
 * 1. Usuario solicita menú (durante login o refresh)
 * 2. Buscar en caché por userId
 * 3. Si no expirado: retornar del caché (hit)
 * 4. Si expirado o no existe: queryAR BD, guardar en caché (miss)
 * 5. Cuando roles/permisos cambian: invalidateMenuCache()
 *
 * @module lib/menu/menu-cache
 * @see {@link ../../modules/admin/services} para getMenuForUser
 * @see {@link ../../modules/admin/types} para MenuItem type
 *
 * @example
 * ```typescript
 * import { getCachedMenu, invalidateMenuCache } from '@/lib/menu/menu-cache';
 *
 * // En Server Action de login
 * const menu = await getCachedMenu(userId);
 * // → Query BD solo si no en caché o expirado (5 min)
 *
 * // Cuando admin cambia roles de usuario
 * await assignRoleToUser(userId, roleId);
 * invalidateMenuCache(); // Limpiar para que recalcule
 * ```
 */

import type { MenuItem } from '@/modules/admin/types';
import { getMenuForUser } from '@/modules/admin/services';

/**
 * Caché en-memory del menú por usuario
 *
 * Estructura: Map<userId, { menu, timestamp }>
 * - userId: Clave para buscar menú del usuario
 * - menu: Array de items del menú (calculado con roles/permisos)
 * - timestamp: Cuándo se calculó (para comparar con TTL)
 *
 * @type {Map<string, { menu: MenuItem[], timestamp: number }>}
 *
 * @remarks
 * **Limitaciones**:
 * - Memory-only (se pierde al reiniciar servidor)
 * - Puede causar issues en multi-server (sincronizar cache)
 * - Para producción distribuida, considerar Redis
 */
const menuCache = new Map<string, { menu: MenuItem[]; timestamp: number }>();

/**
 * Duración del TTL (Time To Live) del caché en milisegundos
 *
 * Después de este tiempo, el menú en caché se considera expirado
 * y debe recalcularse.
 *
 * **Valor: 5 minutos (300000 ms)**
 * - Suficientemente corto para cambios de roles
 * - Suficientemente largo para reducir queries
 *
 * @type {number}
 * @constant
 *
 * @remarks
 * Ajustable según necesidades:
 * - Corto (30s): Más actualizado, más queries
 * - Largo (30min): Menos queries, menú outdated más tiempo
 * - Recomendado: 5-15 min
 */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtener menú del usuario (con caching automático)
 *
 * Retorna el menú dinámico del usuario generado según sus roles/permisos.
 * Implementa caching transparente con TTL automático.
 *
 * **Flujo**:
 * 1. Buscar en caché por userId
 * 2. Si existe y NO expirado: retornar caché (rápido)
 * 3. Si expirado o no existe: calcular desde BD
 * 4. Guardar en caché con timestamp actual
 * 5. Retornar menú
 *
 * @async
 * @param userId - ID del usuario
 *
 * @returns {Promise<MenuItem[]>} Array de items del menú
 *
 * @remarks
 * **Performance**:
 * - Cache hit: < 1ms (acceso Map)
 * - Cache miss: Variable (depende getMenuForUser)
 * - Típico: 90% hits en caso normal
 *
 * **Seguridad**:
 * - Menú calculado con roles/permisos del usuario
 * - Items no autorizados filtered en BD query
 * - Cache no compromete seguridad (solo caché resultado)
 *
 * **Invalidación**:
 * - TTL automático: expira después de 5 min
 * - Manual: llamar invalidateMenuCache() cuando roles cambian
 *
 * **Casos de Uso**:
 * - Login: calcular menú inicial del usuario
 * - Render de sidebar: caché hit, carga instantánea
 * - Cambio de rol: manual invalidation
 *
 * @example
 * ```typescript
 * // En Server Component o Server Action
 * const menu = await getCachedMenu(userId);
 *
 * // Primer call: query BD (miss)
 * // Siguientes calls (< 5 min): caché (hits)
 *
 * // Después de 5 minutos: recalcula automáticamente
 * ```
 */
export async function getCachedMenu(userId: string): Promise<MenuItem[]> {
  const cached = menuCache.get(userId);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.menu;
  }

  const menu = await getMenuForUser(userId);
  menuCache.set(userId, { menu, timestamp: Date.now() });

  return menu;
}

/**
 * Invalidar TODA la caché de menú
 *
 * Borra todos los menús en caché, forzando recalculación en próximas requests.
 * Debe llamarse cuando cambien roles o permisos del sistema.
 *
 * @returns {void}
 *
 * @remarks
 * **Cuándo Llamar**:
 * - Un admin asigna/remueve rol de usuario
 * - Se actualizan permisos de un rol
 * - Se crea/elimina un rol
 * - Se crean/eliminan items de menú
 * - Actualizaciones de configuración de menú
 *
 * **Efecto**:
 * - Todos los usuarios: próximo request recalcula menú
 * - Impacto: 1-2 requests con latencia (queries BD)
 * - Después: nuevo caché por 5 minutos
 *
 * **Alternativa más Granular**:
 * Podría implementarse invalidateMenuForUser(userId) si muchos cambios
 * de rol frecuentes (seria más eficiente).
 *
 * **Cuándo NO Necesario**:
 * - TTL automático se encarga después de 5 minutos
 * - Solo necesario para cambios INMEDIATOS
 *
 * @example
 * ```typescript
 * // En Server Action de asignar rol
 * export async function assignRoleAction(userId: string, roleId: string) {
 *   await assignRoleToUser(userId, roleId);
 *
 *   // Invalidar caché para que menú se recalcule
 *   invalidateMenuCache();
 *
 *   // Próximo refresh de usuario: menú actualizado
 *   return { success: true };
 * }
 * ```
 */
export function invalidateMenuCache() {
  menuCache.clear();
}
