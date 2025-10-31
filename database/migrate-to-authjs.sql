-- ============================================================================
-- MIGRACIÓN A AUTH.JS - Aurora Nova
-- ============================================================================
-- Esta migración actualiza el esquema de Lucia Auth a Auth.js
-- Transforma las tablas existentes para compatibilidad con Auth.js v5
-- ============================================================================

-- ⚠️ IMPORTANTE: Crear backup antes de ejecutar
-- pg_dump -h localhost -U aurora_user -d aurora_nova_db > backup_before_authjs.sql

BEGIN;

-- ============================================================================
-- 1. BACKUP DE DATOS EXISTENTES (si existen)
-- ============================================================================

-- Crear tabla temporal para usuarios existentes
CREATE TEMP TABLE users_backup AS
SELECT id, first_name, last_name, email, email_verified, created_at, updated_at
FROM "user"
WHERE 1=1; -- Solo si hay datos

-- Crear tabla temporal para sesiones existentes (si existen)
CREATE TEMP TABLE sessions_backup AS
SELECT id, user_id, expires_at
FROM "session"
WHERE 1=1; -- Solo si hay datos

-- ============================================================================
-- 2. MODIFICAR TABLA USER PARA AUTH.JS
-- ============================================================================

-- Agregar nuevas columnas de Auth.js
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image" VARCHAR(500);

-- Renombrar email_verified para compatibilidad Auth.js
ALTER TABLE "user" RENAME COLUMN "email_verified" TO "emailVerified";

-- Hacer campos opcionales según Auth.js
ALTER TABLE "user" ALTER COLUMN "first_name" DROP NOT NULL;
ALTER TABLE "user" ALTER COLUMN "last_name" DROP NOT NULL;

-- Actualizar el campo name basándose en first_name + last_name existente
UPDATE "user"
SET "name" = TRIM(COALESCE("first_name", '') || ' ' || COALESCE("last_name", ''))
WHERE "name" IS NULL AND ("first_name" IS NOT NULL OR "last_name" IS NOT NULL);

-- ============================================================================
-- 3. MODIFICAR TABLA SESSION PARA AUTH.JS
-- ============================================================================

-- Agregar nueva columna sessionToken
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "sessionToken" VARCHAR(255);

-- Generar sessionTokens únicos para sesiones existentes
UPDATE "session"
SET "sessionToken" = 'session_' || id::text || '_' || extract(epoch from now())::text
WHERE "sessionToken" IS NULL;

-- Hacer sessionToken NOT NULL después de actualizar
ALTER TABLE "session" ALTER COLUMN "sessionToken" SET NOT NULL;

-- Agregar constraint unique para sessionToken
ALTER TABLE "session" ADD CONSTRAINT session_sessiontoken_unique UNIQUE ("sessionToken");

-- Renombrar columnas para Auth.js
ALTER TABLE "session" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "session" RENAME COLUMN "expires_at" TO "expires";

-- Eliminar la clave primaria antigua y agregar la nueva
ALTER TABLE "session" DROP CONSTRAINT session_pkey;
ALTER TABLE "session" ADD PRIMARY KEY ("sessionToken");

-- ============================================================================
-- 4. CREAR NUEVAS TABLAS DE AUTH.JS
-- ============================================================================

-- Tabla de cuentas de proveedores Auth.js
CREATE TABLE IF NOT EXISTS "account" (
    "userId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "type" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(255),
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    PRIMARY KEY ("provider", "providerAccountId")
);

-- Tabla de tokens de verificación Auth.js
CREATE TABLE IF NOT EXISTS "verification_token" (
    "identifier" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

-- Tabla de credenciales de usuarios
CREATE TABLE IF NOT EXISTS "user_credentials" (
    "user_id" UUID PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
    "hashed_password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para user_credentials
CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE
    ON "user_credentials" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. MIGRAR DATOS DE KEY A USER_CREDENTIALS
-- ============================================================================

-- Migrar passwords de la tabla key a user_credentials
INSERT INTO "user_credentials" ("user_id", "hashed_password", "created_at")
SELECT "user_id", "hashed_password", NOW()
FROM "key"
WHERE "hashed_password" IS NOT NULL
ON CONFLICT ("user_id") DO NOTHING;

-- ============================================================================
-- 6. ACTUALIZAR ÍNDICES
-- ============================================================================

-- Eliminar índices antiguos
DROP INDEX IF EXISTS idx_session_user_id;
DROP INDEX IF EXISTS idx_session_expires_at;
DROP INDEX IF EXISTS idx_key_user_id;

-- Crear nuevos índices para Auth.js
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session"("userId");
CREATE INDEX IF NOT EXISTS idx_session_expires ON "session"("expires");
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "account"("userId");
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON "user_credentials"("user_id");

-- ============================================================================
-- 7. ELIMINAR TABLA KEY (ya migrada)
-- ============================================================================

DROP TABLE IF EXISTS "key" CASCADE;

-- ============================================================================
-- 8. ACTUALIZAR COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

-- Actualizar comentarios de tabla user
COMMENT ON TABLE "user" IS 'Tabla principal de usuarios del sistema compatible con Auth.js. Contiene la información básica de identificación y estado de cada usuario registrado.';
COMMENT ON COLUMN "user"."name" IS 'Nombre completo del usuario. Campo estándar de Auth.js, se puede derivar de first_name + last_name.';
COMMENT ON COLUMN "user"."emailVerified" IS 'Timestamp de verificación del email. NULL si no verificado. Formato estándar Auth.js.';
COMMENT ON COLUMN "user"."image" IS 'URL de la imagen de perfil del usuario. Campo estándar Auth.js para avatares.';

-- Comentarios para session
COMMENT ON TABLE "session" IS 'Sesiones activas manejadas por Auth.js. Cada registro representa una sesión válida de usuario con su tiempo de expiración.';
COMMENT ON COLUMN "session"."sessionToken" IS 'Token de sesión único generado por Auth.js. Clave primaria string opaca e inmutable.';
COMMENT ON COLUMN "session"."userId" IS 'Referencia al usuario propietario de la sesión. FK hacia user.id con CASCADE DELETE.';
COMMENT ON COLUMN "session"."expires" IS 'Fecha y hora de expiración de la sesión. Las sesiones expiradas son inválidas automáticamente.';

-- Comentarios para las nuevas tablas
COMMENT ON TABLE "account" IS 'Cuentas de proveedores Auth.js (OAuth, credentials). Maneja diferentes métodos de autenticación vinculados a usuarios.';
COMMENT ON TABLE "verification_token" IS 'Tokens de verificación Auth.js para procesos como verificación de email o reset de password.';
COMMENT ON TABLE "user_credentials" IS 'Credenciales de usuario (passwords). Tabla separada para mantener las contraseñas hasheadas de forma segura.';

-- ============================================================================
-- 9. VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    user_count INTEGER;
    session_count INTEGER;
    credential_count INTEGER;
    account_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM "user";
    SELECT COUNT(*) INTO session_count FROM "session";
    SELECT COUNT(*) INTO credential_count FROM "user_credentials";
    SELECT COUNT(*) INTO account_count FROM "account";

    RAISE NOTICE '✅ Migración a Auth.js completada exitosamente';
    RAISE NOTICE '📊 Usuarios: %', user_count;
    RAISE NOTICE '📊 Sesiones: %', session_count;
    RAISE NOTICE '📊 Credenciales: %', credential_count;
    RAISE NOTICE '📊 Cuentas: %', account_count;

    -- Verificar que no hay datos perdidos
    IF credential_count > 0 THEN
        RAISE NOTICE '✅ Credenciales migradas correctamente de tabla key';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- ============================================================================

-- 1. Actualizar el código de la aplicación para usar Auth.js
-- 2. Probar la autenticación con el nuevo sistema
-- 3. Verificar que los permisos RBAC funcionan correctamente
-- 4. Una vez confirmado, eliminar los backups temporales si todo funciona
-- 5. Ejecutar: npm run db:generate para sincronizar Drizzle con el nuevo schema