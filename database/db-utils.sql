-- ============================================================================
-- UTILIDADES DE BASE DE DATOS - Aurora Nova
-- ============================================================================
-- Script con consultas útiles para desarrollo y debugging
-- ============================================================================

-- ============================================================================
-- INFORMACIÓN GENERAL DEL ESQUEMA
-- ============================================================================

-- Ver todas las tablas con sus comentarios
SELECT
    schemaname,
    tablename,
    obj_description(pgc.oid) as table_comment
FROM pg_tables pt
JOIN pg_class pgc ON pgc.relname = pt.tablename
WHERE schemaname = 'public'
AND tablename IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY tablename;

-- Ver todas las columnas con sus tipos y comentarios
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    col_description(pgc.oid, c.ordinal_position) as column_comment
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
JOIN pg_class pgc ON pgc.relname = t.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY t.table_name, c.ordinal_position;

-- Ver todos los índices
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef,
    obj_description(i.indexrelid) as index_comment
FROM pg_indexes pi
JOIN pg_class i ON i.relname = pi.indexname
WHERE schemaname = 'public'
AND tablename IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY tablename, indexname;

-- ============================================================================
-- CONSULTAS DE DATOS
-- ============================================================================

-- Resumen de datos por tabla
SELECT 'user' as tabla, COUNT(*) as registros FROM "user"
UNION ALL
SELECT 'role' as tabla, COUNT(*) as registros FROM "role"
UNION ALL
SELECT 'permission' as tabla, COUNT(*) as registros FROM "permission"
UNION ALL
SELECT 'session' as tabla, COUNT(*) as registros FROM "session"
UNION ALL
SELECT 'key' as tabla, COUNT(*) as registros FROM "key"
UNION ALL
SELECT 'user_role' as tabla, COUNT(*) as registros FROM "user_role"
UNION ALL
SELECT 'role_permission' as tabla, COUNT(*) as registros FROM "role_permission"
ORDER BY tabla;

-- Ver roles con cantidad de permisos asignados
SELECT
    r.name as rol,
    r.description as descripcion,
    COUNT(rp.permission_id) as total_permisos,
    STRING_AGG(rp.permission_id, ', ' ORDER BY rp.permission_id) as permisos
FROM "role" r
LEFT JOIN "role_permission" rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.description
ORDER BY total_permisos DESC;

-- Ver permisos agrupados por módulo
SELECT
    p.module as modulo,
    COUNT(*) as total_permisos,
    STRING_AGG(p.id, ', ' ORDER BY p.id) as permisos
FROM "permission" p
GROUP BY p.module
ORDER BY p.module;

-- Ver usuarios con sus roles (si existen usuarios)
SELECT
    u.first_name || ' ' || u.last_name as nombre_completo,
    u.email,
    u.email_verified,
    r.name as rol,
    ur.created_at as fecha_asignacion
FROM "user" u
LEFT JOIN "user_role" ur ON u.id = ur.user_id
LEFT JOIN "role" r ON ur.role_id = r.id
ORDER BY u.email, r.name;

-- ============================================================================
-- CONSULTAS DE VALIDACIÓN Y DEBUGGING
-- ============================================================================

-- Verificar integridad referencial
SELECT
    'user_role -> user' as relacion,
    COUNT(*) as registros_huerfanos
FROM "user_role" ur
LEFT JOIN "user" u ON ur.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT
    'user_role -> role' as relacion,
    COUNT(*) as registros_huerfanos
FROM "user_role" ur
LEFT JOIN "role" r ON ur.role_id = r.id
WHERE r.id IS NULL

UNION ALL

SELECT
    'role_permission -> role' as relacion,
    COUNT(*) as registros_huerfanos
FROM "role_permission" rp
LEFT JOIN "role" r ON rp.role_id = r.id
WHERE r.id IS NULL

UNION ALL

SELECT
    'role_permission -> permission' as relacion,
    COUNT(*) as registros_huerfanos
FROM "role_permission" rp
LEFT JOIN "permission" p ON rp.permission_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT
    'session -> user' as relacion,
    COUNT(*) as registros_huerfanos
FROM "session" s
LEFT JOIN "user" u ON s.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT
    'key -> user' as relacion,
    COUNT(*) as registros_huerfanos
FROM "key" k
LEFT JOIN "user" u ON k.user_id = u.id
WHERE u.id IS NULL;

-- Verificar que uuidv7() está funcionando
SELECT
    'Test uuidv7()' as test,
    uuidv7() as uuid_generado,
    LENGTH(uuidv7()::text) as longitud,
    CASE
        WHEN uuidv7() IS NOT NULL THEN 'OK'
        ELSE 'ERROR'
    END as estado;

-- Ver triggers activos
SELECT
    schemaname,
    tablename,
    triggername,
    obj_description(t.oid) as trigger_comment
FROM pg_trigger pt
JOIN pg_class pgc ON pt.tgrelid = pgc.oid
JOIN pg_namespace n ON pgc.relnamespace = n.oid
JOIN pg_trigger t ON t.oid = pt.oid
WHERE n.nspname = 'public'
AND pgc.relname IN ('user', 'role')
AND NOT pt.tgisinternal;

-- ============================================================================
-- CONSULTAS DE RENDIMIENTO
-- ============================================================================

-- Tamaño de las tablas
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamaño_total,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as tamaño_tabla,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as tamaño_indices
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Uso de índices (requiere datos para ser significativo)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as usos_indice,
    idx_tup_read as tuplas_leidas,
    idx_tup_fetch as tuplas_obtenidas
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY idx_scan DESC;