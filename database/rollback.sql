-- ============================================================================
-- SCRIPT DE ROLLBACK COMPLETO - Aurora Nova
-- ============================================================================
-- Este script elimina completamente el esquema de Aurora Nova y deja la BD
-- en estado inicial (recién creada, sin objetos)
--
-- ADVERTENCIA: Este script es DESTRUCTIVO y NO REVERSIBLE
-- - Elimina TODAS las tablas y sus datos
-- - Elimina triggers, funciones y constraints
-- - Elimina índices creados
-- - NO se pueden recuperar los datos después de ejecutar
--
-- Uso: Solo para desarrollo y testing
-- ============================================================================

-- Mensaje de advertencia
DO $$
BEGIN
    RAISE NOTICE '🚨 INICIANDO ROLLBACK COMPLETO DEL ESQUEMA AURORA NOVA';
    RAISE NOTICE '⚠️  ADVERTENCIA: Este proceso eliminará TODOS los datos';
    RAISE NOTICE '📋 Verificando estado actual...';
END $$;

-- ============================================================================
-- PASO 1: VERIFICACIÓN DEL ESTADO ACTUAL
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    user_count INTEGER;
    permission_count INTEGER;
BEGIN
    -- Contar objetos existentes
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission');

    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'update_updated_at_column';

    -- Contar datos si las tablas existen
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user' AND table_schema = 'public') THEN
        EXECUTE 'SELECT COUNT(*) FROM "user"' INTO user_count;
    ELSE
        user_count := 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission' AND table_schema = 'public') THEN
        EXECUTE 'SELECT COUNT(*) FROM "permission"' INTO permission_count;
    ELSE
        permission_count := 0;
    END IF;

    RAISE NOTICE '📊 Estado actual:';
    RAISE NOTICE '   - Tablas de Aurora Nova: %', table_count;
    RAISE NOTICE '   - Funciones personalizadas: %', function_count;
    RAISE NOTICE '   - Usuarios registrados: %', user_count;
    RAISE NOTICE '   - Permisos configurados: %', permission_count;

    IF table_count = 0 THEN
        RAISE NOTICE '✅ No se encontraron tablas de Aurora Nova para eliminar';
        RETURN;
    END IF;
END $$;

-- ============================================================================
-- PASO 2: ELIMINACIÓN DE TABLAS EN ORDEN CORRECTO
-- ============================================================================

-- Eliminar tablas de unión primero (tienen FKs hacia otras tablas)
DROP TABLE IF EXISTS "role_permission" CASCADE;
DROP TABLE IF EXISTS "user_role" CASCADE;

-- Eliminar tablas dependientes
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "key" CASCADE;

-- Eliminar tablas de referencia
DROP TABLE IF EXISTS "permission" CASCADE;
DROP TABLE IF EXISTS "role" CASCADE;

-- Eliminar tabla principal
DROP TABLE IF EXISTS "user" CASCADE;

DO $$
BEGIN
    RAISE NOTICE '🗑️  Tablas eliminadas:';
    RAISE NOTICE '   ✅ role_permission (tabla de unión)';
    RAISE NOTICE '   ✅ user_role (tabla de unión)';
    RAISE NOTICE '   ✅ session (sesiones de Lucia Auth)';
    RAISE NOTICE '   ✅ key (claves de autenticación)';
    RAISE NOTICE '   ✅ permission (permisos del sistema)';
    RAISE NOTICE '   ✅ role (roles del sistema)';
    RAISE NOTICE '   ✅ user (usuarios principales)';
END $$;

-- ============================================================================
-- PASO 3: ELIMINACIÓN DE FUNCIONES Y TRIGGERS
-- ============================================================================

-- Eliminar función de trigger (los triggers se eliminaron automáticamente con las tablas)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DO $$
BEGIN
    RAISE NOTICE '🔧 Funciones y triggers eliminados:';
    RAISE NOTICE '   ✅ update_updated_at_column() (función de trigger)';
    RAISE NOTICE '   ✅ Todos los triggers asociados (eliminados automáticamente)';
END $$;

-- ============================================================================
-- PASO 4: LIMPIEZA DE TIPOS PERSONALIZADOS (si existieran)
-- ============================================================================

-- Aurora Nova no define tipos personalizados, pero incluimos verificación
DO $$
DECLARE
    custom_type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO custom_type_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'c'  -- composite types
    AND t.typname LIKE '%aurora%';

    IF custom_type_count > 0 THEN
        RAISE NOTICE '🔍 Encontrados % tipos personalizados relacionados', custom_type_count;
        -- Aquí se podrían eliminar tipos específicos si existieran
    ELSE
        RAISE NOTICE '✅ No se encontraron tipos personalizados para eliminar';
    END IF;
END $$;

-- ============================================================================
-- PASO 5: VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    remaining_tables INTEGER;
    remaining_functions INTEGER;
BEGIN
    -- Verificar que no queden objetos de Aurora Nova
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user', 'session', 'key', 'role', 'permission', 'user_role', 'role_permission');

    SELECT COUNT(*) INTO remaining_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'update_updated_at_column';

    RAISE NOTICE '🔍 Verificación final:';
    RAISE NOTICE '   - Tablas restantes: %', remaining_tables;
    RAISE NOTICE '   - Funciones restantes: %', remaining_functions;

    IF remaining_tables = 0 AND remaining_functions = 0 THEN
        RAISE NOTICE '✅ ROLLBACK COMPLETADO EXITOSAMENTE';
        RAISE NOTICE '🎯 La base de datos está ahora en estado inicial (sin objetos de Aurora Nova)';
        RAISE NOTICE '📋 Lista para ejecutar schema.sql nuevamente si es necesario';
    ELSE
        RAISE WARNING '⚠️  Algunos objetos no fueron eliminados completamente';
        RAISE NOTICE '🔧 Puede ser necesario revisión manual';
    END IF;
END $$;

-- ============================================================================
-- PASO 6: INFORMACIÓN FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📚 INFORMACIÓN POSTERIOR AL ROLLBACK:';
    RAISE NOTICE '   - Para recrear el esquema: psql ... -f schema.sql';
    RAISE NOTICE '   - Para poblar datos: psql ... -f seeds.sql';
    RAISE NOTICE '   - Para aplicar comentarios: psql ... -f schema-comments.sql';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  RECORDATORIO: Los datos eliminados NO son recuperables';
    RAISE NOTICE '💾 Asegúrate de tener backups si necesitas restaurar información';
    RAISE NOTICE '';
END $$;