-- ============================================================================
-- UTILIDADES DE BASE DE DATOS - Aurora Nova
-- ============================================================================
-- Script con consultas útiles para desarrollo y debugging
-- Compatible con Auth.js y PostgreSQL 18+
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
AND tablename IN ('user', 'account', 'session', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission')
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
AND t.table_name IN ('user', 'account', 'session', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission')
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
AND tablename IN ('user', 'account', 'session', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY tablename, indexname;

-- ============================================================================
-- CONSULTAS DE DATOS
-- ============================================================================

-- Resumen de datos por tabla
SELECT 'user' as tabla, COUNT(*) as registros FROM "user"
UNION ALL
SELECT 'account' as tabla, COUNT(*) as registros FROM "account"
UNION ALL
SELECT 'session' as tabla, COUNT(*) as registros FROM "session"
UNION ALL
SELECT 'verification_token' as tabla, COUNT(*) as registros FROM "verification_token"
UNION ALL
SELECT 'user_credentials' as tabla, COUNT(*) as registros FROM "user_credentials"
UNION ALL
SELECT 'role' as tabla, COUNT(*) as registros FROM "role"
UNION ALL
SELECT 'permission' as tabla, COUNT(*) as registros FROM "permission"
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

-- Ver usuarios con sus roles
SELECT
    COALESCE(u.name, u.first_name || ' ' || u.last_name) as nombre_completo,
    u.email,
    u."emailVerified",
    r.name as rol,
    ur.created_at as fecha_asignacion
FROM "user" u
LEFT JOIN "user_role" ur ON u.id = ur.user_id
LEFT JOIN "role" r ON ur.role_id = r.id
ORDER BY u.email, r.name;

-- Ver sesiones activas con información de usuario
SELECT
    s."sessionToken",
    u.email,
    u.name,
    s.expires,
    CASE
        WHEN s.expires > NOW() THEN 'Activa'
        ELSE 'Expirada'
    END as estado
FROM "session" s
JOIN "user" u ON s."userId" = u.id
ORDER BY s.expires DESC;

-- Ver usuarios con credenciales y roles
SELECT
    u.id,
    u.email,
    u.name,
    u."emailVerified",
    CASE WHEN uc.user_id IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_password,
    COUNT(DISTINCT ur.role_id) as cantidad_roles,
    STRING_AGG(DISTINCT r.name, ', ' ORDER BY r.name) as roles
FROM "user" u
LEFT JOIN "user_credentials" uc ON u.id = uc.user_id
LEFT JOIN "user_role" ur ON u.id = ur.user_id
LEFT JOIN "role" r ON ur.role_id = r.id
GROUP BY u.id, u.email, u.name, u."emailVerified", uc.user_id
ORDER BY u.created_at DESC;

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
LEFT JOIN "user" u ON s."userId" = u.id
WHERE u.id IS NULL

UNION ALL

SELECT
    'account -> user' as relacion,
    COUNT(*) as registros_huerfanos
FROM "account" a
LEFT JOIN "user" u ON a."userId" = u.id
WHERE u.id IS NULL

UNION ALL

SELECT
    'user_credentials -> user' as relacion,
    COUNT(*) as registros_huerfanos
FROM "user_credentials" uc
LEFT JOIN "user" u ON uc.user_id = u.id
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
    n.nspname as schema,
    pgc.relname as tabla,
    pt.tgname as trigger,
    pg_get_triggerdef(pt.oid) as definicion
FROM pg_trigger pt
JOIN pg_class pgc ON pt.tgrelid = pgc.oid
JOIN pg_namespace n ON pgc.relnamespace = n.oid
WHERE n.nspname = 'public'
AND NOT pt.tgisinternal
AND pgc.relname IN ('user', 'user_credentials', 'role')
ORDER BY pgc.relname, pt.tgname;

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
AND tablename IN ('user', 'account', 'session', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission')
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
AND tablename IN ('user', 'account', 'session', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission')
ORDER BY idx_scan DESC;

-- ============================================================================
-- CONSULTAS DE SEGURIDAD
-- ============================================================================

-- Usuarios sin roles asignados
SELECT
    u.id,
    u.email,
    u.name,
    u.created_at
FROM "user" u
LEFT JOIN "user_role" ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ORDER BY u.created_at DESC;

-- Roles sin permisos
SELECT
    r.id,
    r.name,
    r.description,
    r.created_at
FROM "role" r
LEFT JOIN "role_permission" rp ON r.id = rp.role_id
WHERE rp.role_id IS NULL
ORDER BY r.created_at DESC;

-- Usuarios sin credenciales (solo OAuth)
SELECT
    u.id,
    u.email,
    u.name,
    u.created_at
FROM "user" u
LEFT JOIN "user_credentials" uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL
ORDER BY u.created_at DESC;

-- Sesiones expiradas (para limpieza)
SELECT
    COUNT(*) as sesiones_expiradas,
    MIN(expires) as mas_antigua,
    MAX(expires) as mas_reciente
FROM "session"
WHERE expires < NOW();
