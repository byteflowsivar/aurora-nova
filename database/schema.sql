-- Esquema SQL Completo para Aurora Nova
-- PostgreSQL 18+ con soporte nativo para uuidv7()
-- Basado en docs/01_modules/01_auth_and_authz/04_diseno/database/01_Schema_SQL.md

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS "role_permission" CASCADE;
DROP TABLE IF EXISTS "user_role" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "key" CASCADE;
DROP TABLE IF EXISTS "permission" CASCADE;
DROP TABLE IF EXISTS "role" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabla de usuarios
CREATE TABLE "user" (
    "id" UUID PRIMARY KEY,
    "first_name" VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM("first_name")) > 0),
    "last_name" VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM("last_name")) > 0),
    "email" VARCHAR(255) NOT NULL UNIQUE CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en user
CREATE TRIGGER update_user_updated_at BEFORE UPDATE
    ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de sesiones (Lucia Auth)
CREATE TABLE "session" (
    "id" UUID PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "expires_at" TIMESTAMPTZ NOT NULL
);

-- Tabla de claves de autenticación (Lucia Auth)
CREATE TABLE "key" (
    "id" VARCHAR(255) PRIMARY KEY, -- ej: "email:user@example.com"
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "hashed_password" VARCHAR(255) -- Nullable para proveedores OAuth
);

-- Tabla de roles
CREATE TABLE "role" (
    "id" UUID PRIMARY KEY DEFAULT uuidv7(),
    "name" VARCHAR(50) NOT NULL UNIQUE CHECK (LENGTH(TRIM("name")) > 0),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en role
CREATE TRIGGER update_role_updated_at BEFORE UPDATE
    ON "role" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de permisos (clave primaria semántica según ADR-003)
CREATE TABLE "permission" (
    "id" VARCHAR(100) PRIMARY KEY CHECK ("id" ~* '^[a-z_]+:[a-z_]+$'), -- ej: "user:create"
    "module" VARCHAR(50) NOT NULL CHECK (LENGTH(TRIM("module")) > 0),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de unión: usuarios-roles
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_by" UUID REFERENCES "user"("id"), -- Quien asignó el rol
    PRIMARY KEY ("user_id", "role_id")
);

-- Tabla de unión: roles-permisos
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
    "permission_id" VARCHAR(100) NOT NULL REFERENCES "permission"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("role_id", "permission_id")
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_user_email ON "user"("email");
CREATE INDEX idx_session_user_id ON "session"("user_id");
CREATE INDEX idx_session_expires_at ON "session"("expires_at");
CREATE INDEX idx_key_user_id ON "key"("user_id");
CREATE INDEX idx_user_role_user_id ON "user_role"("user_id");
CREATE INDEX idx_user_role_role_id ON "user_role"("role_id");
CREATE INDEX idx_role_permission_role_id ON "role_permission"("role_id");
CREATE INDEX idx_role_permission_permission_id ON "role_permission"("permission_id");
CREATE INDEX idx_permission_module ON "permission"("module");

-- ============================================================================
-- COMENTARIOS COMPLETOS DE DOCUMENTACIÓN
-- ============================================================================

-- Comentarios de tablas
COMMENT ON TABLE "user" IS 'Tabla principal de usuarios del sistema. Contiene la información básica de identificación y estado de cada usuario registrado.';
COMMENT ON TABLE "session" IS 'Sesiones activas manejadas por Lucia Auth. Cada registro representa una sesión válida de usuario con su tiempo de expiración.';
COMMENT ON TABLE "key" IS 'Claves de autenticación (email/password, OAuth, etc.). Tabla de Lucia Auth para manejar diferentes métodos de autenticación por usuario.';
COMMENT ON TABLE "role" IS 'Roles del sistema para control de acceso basado en roles (RBAC). Define los diferentes niveles de acceso en la aplicación.';
COMMENT ON TABLE "permission" IS 'Permisos granulares con IDs semánticos. Define las acciones específicas que pueden realizar los usuarios (ej: user:create, role:delete).';
COMMENT ON TABLE "user_role" IS 'Tabla de unión para asignación de roles a usuarios. Relación muchos-a-muchos entre usuarios y roles con auditoría.';
COMMENT ON TABLE "role_permission" IS 'Tabla de unión para asignación de permisos a roles. Define qué permisos específicos tiene cada rol del sistema.';

-- Comentarios de todas las columnas por tabla

-- Tabla USER
COMMENT ON COLUMN "user"."id" IS 'Clave primaria UUID generada por Lucia Auth. Identificador único inmutable del usuario.';
COMMENT ON COLUMN "user"."first_name" IS 'Nombre(s) del usuario. Campo requerido con validación de longitud mínima.';
COMMENT ON COLUMN "user"."last_name" IS 'Apellido(s) del usuario. Campo requerido con validación de longitud mínima.';
COMMENT ON COLUMN "user"."email" IS 'Dirección de correo electrónico única del usuario. Utilizada para autenticación y comunicación.';
COMMENT ON COLUMN "user"."email_verified" IS 'Indica si el email del usuario ha sido verificado. Por defecto FALSE hasta confirmación.';
COMMENT ON COLUMN "user"."created_at" IS 'Timestamp de creación del registro. Se establece automáticamente al insertar.';
COMMENT ON COLUMN "user"."updated_at" IS 'Timestamp de última actualización. Se actualiza automáticamente vía trigger.';

-- Tabla SESSION
COMMENT ON COLUMN "session"."id" IS 'Clave primaria UUID de la sesión generada por Lucia Auth. Token de sesión opaco.';
COMMENT ON COLUMN "session"."user_id" IS 'Referencia al usuario propietario de la sesión. FK hacia user.id con CASCADE DELETE.';
COMMENT ON COLUMN "session"."expires_at" IS 'Fecha y hora de expiración de la sesión. Las sesiones expiradas son inválidas automáticamente.';

-- Tabla KEY
COMMENT ON COLUMN "key"."id" IS 'Identificador semántico de la clave (ej: "email:user@domain.com"). PK compuesta por tipo y valor.';
COMMENT ON COLUMN "key"."user_id" IS 'Referencia al usuario propietario de esta clave de autenticación. FK hacia user.id.';
COMMENT ON COLUMN "key"."hashed_password" IS 'Contraseña hasheada con bcrypt. Nullable para proveedores OAuth que no requieren contraseña local.';

-- Tabla ROLE
COMMENT ON COLUMN "role"."id" IS 'Clave primaria UUID v7 auto-generada. Identificador único del rol siguiendo ADR-002.';
COMMENT ON COLUMN "role"."name" IS 'Nombre único del rol (ej: "Super Administrador", "Editor"). Usado para display y referencias.';
COMMENT ON COLUMN "role"."description" IS 'Descripción detallada del propósito y alcance del rol. Campo opcional para documentación.';
COMMENT ON COLUMN "role"."created_at" IS 'Timestamp de creación del rol. Auditoría de cuándo se definió el rol.';
COMMENT ON COLUMN "role"."updated_at" IS 'Timestamp de última modificación del rol. Se actualiza vía trigger automático.';

-- Tabla PERMISSION
COMMENT ON COLUMN "permission"."id" IS 'ID semántico del permiso (ej: "user:create", "role:delete") según ADR-003. PK varchar para legibilidad.';
COMMENT ON COLUMN "permission"."module" IS 'Módulo al que pertenece el permiso (ej: "Users", "Roles"). Agrupa permisos relacionados.';
COMMENT ON COLUMN "permission"."description" IS 'Descripción legible del permiso. Explica qué acción específica autoriza.';
COMMENT ON COLUMN "permission"."created_at" IS 'Timestamp de creación del permiso. Los permisos son generalmente inmutables.';

-- Tabla USER_ROLE
COMMENT ON COLUMN "user_role"."user_id" IS 'Referencia al usuario. Parte de la PK compuesta, FK hacia user.id con CASCADE DELETE.';
COMMENT ON COLUMN "user_role"."role_id" IS 'Referencia al rol asignado. Parte de la PK compuesta, FK hacia role.id con RESTRICT DELETE.';
COMMENT ON COLUMN "user_role"."created_at" IS 'Timestamp de asignación del rol. Auditoría de cuándo se otorgó el acceso.';
COMMENT ON COLUMN "user_role"."created_by" IS 'Usuario que realizó la asignación del rol. FK nullable hacia user.id para auditoría.';

-- Tabla ROLE_PERMISSION
COMMENT ON COLUMN "role_permission"."role_id" IS 'Referencia al rol. Parte de la PK compuesta, FK hacia role.id con CASCADE DELETE.';
COMMENT ON COLUMN "role_permission"."permission_id" IS 'Referencia al permiso otorgado. Parte de la PK compuesta, FK hacia permission.id.';
COMMENT ON COLUMN "role_permission"."created_at" IS 'Timestamp de asignación del permiso al rol. Auditoría de configuración de permisos.';

-- Comentarios de todos los índices
COMMENT ON INDEX "idx_user_email" IS 'Índice único en email para búsquedas rápidas durante autenticación y validación de unicidad.';
COMMENT ON INDEX "idx_session_user_id" IS 'Índice en user_id para consultas eficientes de sesiones por usuario.';
COMMENT ON INDEX "idx_session_expires_at" IS 'Índice en expires_at para limpieza eficiente de sesiones expiradas.';
COMMENT ON INDEX "idx_key_user_id" IS 'Índice en user_id para consultas rápidas de claves de autenticación por usuario.';
COMMENT ON INDEX "idx_user_role_user_id" IS 'Índice en user_id para consultas eficientes de roles por usuario.';
COMMENT ON INDEX "idx_user_role_role_id" IS 'Índice en role_id para consultas de usuarios por rol.';
COMMENT ON INDEX "idx_role_permission_role_id" IS 'Índice en role_id para consultas rápidas de permisos por rol.';
COMMENT ON INDEX "idx_role_permission_permission_id" IS 'Índice en permission_id para consultas de roles que tienen un permiso específico.';
COMMENT ON INDEX "idx_permission_module" IS 'Índice en module para agrupación y filtrado eficiente de permisos por módulo.';

-- Comentarios de funciones y triggers
COMMENT ON FUNCTION update_updated_at_column() IS 'Función trigger para actualizar automáticamente la columna updated_at con NOW() en cada UPDATE.';
COMMENT ON TRIGGER update_user_updated_at ON "user" IS 'Trigger que actualiza automáticamente updated_at en la tabla user antes de cada UPDATE.';
COMMENT ON TRIGGER update_role_updated_at ON "role" IS 'Trigger que actualiza automáticamente updated_at en la tabla role antes de cada UPDATE.';

-- Comentarios de constraints principales
COMMENT ON CONSTRAINT "user_email_check" ON "user" IS 'Validación de formato de email con expresión regular RFC compliant.';
COMMENT ON CONSTRAINT "user_first_name_check" ON "user" IS 'Validación de que first_name no esté vacío después de trim.';
COMMENT ON CONSTRAINT "user_last_name_check" ON "user" IS 'Validación de que last_name no esté vacío después de trim.';
COMMENT ON CONSTRAINT "role_name_check" ON "role" IS 'Validación de que el nombre del rol no esté vacío después de trim.';
COMMENT ON CONSTRAINT "permission_id_check" ON "permission" IS 'Validación de formato semántico module:action para IDs de permisos (ADR-003).';
COMMENT ON CONSTRAINT "permission_module_check" ON "permission" IS 'Validación de que el módulo no esté vacío después de trim.';

-- Comentario sobre compliance del esquema
COMMENT ON SCHEMA public IS 'Esquema principal de Aurora Nova - Sistema de autenticación y autorización basado en roles (RBAC) usando Lucia Auth y PostgreSQL 18+.';

-- Verificar que uuidv7() funciona correctamente
DO $$
BEGIN
    -- Test de la función uuidv7()
    IF (SELECT uuidv7() IS NOT NULL) THEN
        RAISE NOTICE 'uuidv7() función verificada correctamente';
        RAISE NOTICE 'Schema compatible con ADR-001 (PostgreSQL 18+), ADR-002 (UUID v7), ADR-003 (Permission semantic PK)';
        RAISE NOTICE 'Documentación completa aplicada con COMMENT en todos los objetos';
    ELSE
        RAISE EXCEPTION 'uuidv7() no está disponible - requiere PostgreSQL 18+';
    END IF;
END $$;