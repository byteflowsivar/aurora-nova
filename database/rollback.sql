-- ============================================================================
-- ROLLBACK SCRIPT - Aurora Nova
-- ============================================================================
-- Script para ELIMINAR COMPLETAMENTE el esquema de base de datos
-- ADVERTENCIA: Este script es DESTRUCTIVO e IRREVERSIBLE
-- Todos los datos se perderán permanentemente
-- ============================================================================

-- ============================================================================
-- VERIFICACIONES DE ESTADO PREVIO
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK - Aurora Nova Database';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Contar objetos existentes
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user', 'session', 'account', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission');

    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'update_updated_at_column';

    RAISE NOTICE 'Estado previo:';
    RAISE NOTICE '  - Tablas del sistema: % de 9', table_count;
    RAISE NOTICE '  - Funciones del sistema: %', function_count;
    RAISE NOTICE '';

    IF table_count = 0 AND function_count = 0 THEN
        RAISE NOTICE '⚠️  No hay objetos para eliminar - base de datos ya está limpia';
    ELSE
        RAISE NOTICE '⚠️  ADVERTENCIA: Se eliminarán % tablas y % funciones', table_count, function_count;
        RAISE NOTICE '⚠️  Esta operación es IRREVERSIBLE';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ELIMINACIÓN DE OBJETOS
-- ============================================================================

-- Eliminar tablas en orden correcto (respetar foreign keys)
DROP TABLE IF EXISTS "role_permission" CASCADE;
DROP TABLE IF EXISTS "user_role" CASCADE;
DROP TABLE IF EXISTS "user_credentials" CASCADE;
DROP TABLE IF EXISTS "verification_token" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "permission" CASCADE;
DROP TABLE IF EXISTS "role" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Eliminar función de trigger
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- VERIFICACIÓN DE ESTADO FINAL
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    user_count INTEGER;
    role_count INTEGER;
    permission_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verificación post-rollback';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Contar objetos restantes
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user', 'session', 'account', 'verification_token', 'user_credentials', 'role', 'permission', 'user_role', 'role_permission');

    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'update_updated_at_column';

    RAISE NOTICE 'Estado final:';
    RAISE NOTICE '  - Tablas restantes: %', table_count;
    RAISE NOTICE '  - Funciones restantes: %', function_count;
    RAISE NOTICE '';

    IF table_count = 0 AND function_count = 0 THEN
        RAISE NOTICE '✅ Rollback completado exitosamente';
        RAISE NOTICE '✅ Base de datos limpia y lista para recrear';
    ELSE
        RAISE WARNING '❌ Algunos objetos no pudieron ser eliminados';
        RAISE WARNING 'Tablas restantes: %, Funciones restantes: %', table_count, function_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '  1. Ejecutar: psql ... -f database/schema.sql';
    RAISE NOTICE '  2. Ejecutar: psql ... -f database/seeds.sql';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
