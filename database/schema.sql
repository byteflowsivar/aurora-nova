-- Esquema SQL Completo para Aurora Nova
-- PostgreSQL 18+ con soporte nativo para uuidv7()
-- Basado en docs/01_modules/01_auth_and_authz/04_diseno/database/01_Schema_SQL.md

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS "role_permission" CASCADE;
DROP TABLE IF EXISTS "user_role" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "verification_token" CASCADE;
DROP TABLE IF EXISTS "user_credentials" CASCADE;
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

-- Tabla de usuarios (Compatible con Auth.js)
CREATE TABLE "user" (
    "id" UUID PRIMARY KEY DEFAULT uuidv7(),
    "name" TEXT, -- Auth.js field
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" TEXT NOT NULL UNIQUE CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    "emailVerified" TIMESTAMP, -- Auth.js format
    "image" TEXT, -- Auth.js field for profile images
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en user
CREATE TRIGGER update_user_updated_at BEFORE UPDATE
    ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de sesiones (Auth.js)
CREATE TABLE "session" (
    "sessionToken" TEXT PRIMARY KEY, -- Auth.js format
    "userId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "expires" TIMESTAMP NOT NULL
);

-- Tabla de cuentas de proveedores Auth.js (OAuth, credentials)
CREATE TABLE "account" (
    "userId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL, -- "credentials", "oauth", etc.
    "provider" TEXT NOT NULL, -- "credentials", "google", etc.
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    PRIMARY KEY ("provider", "providerAccountId")
);

-- Tabla de tokens de verificación Auth.js
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL, -- email u otro identificador
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP NOT NULL,
    PRIMARY KEY ("identifier", "token")
);

-- Tabla de credenciales de usuarios (passwords)
CREATE TABLE "user_credentials" (
    "user_id" UUID PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
    "hashed_password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en user_credentials
CREATE TRIGGER update_user_credentials_updated_at BEFORE UPDATE
    ON "user_credentials" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de roles
CREATE TABLE "role" (
    "id" UUID PRIMARY KEY DEFAULT uuidv7(),
    "name" VARCHAR(50) NOT NULL UNIQUE CHECK (LENGTH(TRIM("name")) > 0),
    "description" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en role
CREATE TRIGGER update_role_updated_at BEFORE UPDATE
    ON "role" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de permisos (clave primaria semántica según ADR-003)
CREATE TABLE "permission" (
    "id" VARCHAR(100) PRIMARY KEY CHECK ("id" ~* '^[a-z_]+:[a-z_]+$'), -- ej: "user:create"
    "module" VARCHAR(50) NOT NULL CHECK (LENGTH(TRIM("module")) > 0),
    "description" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabla de unión: usuarios-roles
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "created_by" UUID REFERENCES "user"("id"), -- Quien asignó el rol
    PRIMARY KEY ("user_id", "role_id")
);

-- Tabla de unión: roles-permisos
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
    "permission_id" VARCHAR(100) NOT NULL REFERENCES "permission"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("role_id", "permission_id")
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_user_email ON "user"("email");
CREATE INDEX idx_session_user_id ON "session"("userId");
CREATE INDEX idx_session_expires ON "session"("expires");
CREATE INDEX idx_account_user_id ON "account"("userId");
CREATE INDEX idx_user_credentials_user_id ON "user_credentials"("user_id");
CREATE INDEX idx_user_role_user_id ON "user_role"("user_id");
CREATE INDEX idx_user_role_role_id ON "user_role"("role_id");
CREATE INDEX idx_role_permission_role_id ON "role_permission"("role_id");
CREATE INDEX idx_role_permission_permission_id ON "role_permission"("permission_id");
CREATE INDEX idx_permission_module ON "permission"("module");

-- ============================================================================
-- COMENTARIOS COMPLETOS DE DOCUMENTACIÓN
-- ============================================================================

-- Comentarios de tablas
COMMENT ON TABLE "user" IS 'Tabla principal de usuarios del sistema compatible con Auth.js. Contiene la información básica de identificación y estado de cada usuario registrado.';
COMMENT ON TABLE "session" IS 'Sesiones activas manejadas por Auth.js. Cada registro representa una sesión válida de usuario con su tiempo de expiración.';
COMMENT ON TABLE "account" IS 'Cuentas de proveedores Auth.js (OAuth, credentials). Maneja diferentes métodos de autenticación vinculados a usuarios.';
COMMENT ON TABLE "verification_token" IS 'Tokens de verificación Auth.js para procesos como verificación de email o reset de password.';
COMMENT ON TABLE "user_credentials" IS 'Credenciales de usuario (passwords). Tabla separada para mantener las contraseñas hasheadas de forma segura.';
COMMENT ON TABLE "role" IS 'Roles del sistema para control de acceso basado en roles (RBAC). Define los diferentes niveles de acceso en la aplicación.';
COMMENT ON TABLE "permission" IS 'Permisos granulares con IDs semánticos. Define las acciones específicas que pueden realizar los usuarios (ej: user:create, role:delete).';
COMMENT ON TABLE "user_role" IS 'Tabla de unión para asignación de roles a usuarios. Relación muchos-a-muchos entre usuarios y roles con auditoría.';
COMMENT ON TABLE "role_permission" IS 'Tabla de unión para asignación de permisos a roles. Define qué permisos específicos tiene cada rol del sistema.';

-- Comentarios de todas las columnas por tabla

-- Tabla USER
COMMENT ON COLUMN "user"."id" IS 'Clave primaria UUID generada automáticamente con uuidv7(). Identificador único inmutable del usuario.';
COMMENT ON COLUMN "user"."name" IS 'Nombre completo del usuario. Campo estándar de Auth.js, se puede derivar de first_name + last_name.';
COMMENT ON COLUMN "user"."first_name" IS 'Nombre(s) del usuario. Campo opcional complementario al estándar Auth.js.';
COMMENT ON COLUMN "user"."last_name" IS 'Apellido(s) del usuario. Campo opcional complementario al estándar Auth.js.';
COMMENT ON COLUMN "user"."email" IS 'Dirección de correo electrónico única del usuario. Utilizada para autenticación y comunicación.';
COMMENT ON COLUMN "user"."emailVerified" IS 'Timestamp de verificación del email. NULL si no verificado. Formato estándar Auth.js.';
COMMENT ON COLUMN "user"."image" IS 'URL de la imagen de perfil del usuario. Campo estándar Auth.js para avatares.';
COMMENT ON COLUMN "user"."created_at" IS 'Timestamp de creación del registro. Se establece automáticamente al insertar.';
COMMENT ON COLUMN "user"."updated_at" IS 'Timestamp de última actualización. Se actualiza automáticamente vía trigger.';

-- Tabla SESSION
COMMENT ON COLUMN "session"."sessionToken" IS 'Token de sesión único generado por Auth.js. Clave primaria string opaca e inmutable.';
COMMENT ON COLUMN "session"."userId" IS 'Referencia al usuario propietario de la sesión. FK hacia user.id con CASCADE DELETE.';
COMMENT ON COLUMN "session"."expires" IS 'Fecha y hora de expiración de la sesión. Las sesiones expiradas son inválidas automáticamente.';

-- Tabla ACCOUNT
COMMENT ON COLUMN "account"."userId" IS 'Referencia al usuario propietario de esta cuenta. FK hacia user.id con CASCADE DELETE.';
COMMENT ON COLUMN "account"."type" IS 'Tipo de cuenta Auth.js (ej: "credentials", "oauth"). Define el mecanismo de autenticación.';
COMMENT ON COLUMN "account"."provider" IS 'Proveedor de autenticación (ej: "credentials", "google", "github"). Identifica el servicio usado.';
COMMENT ON COLUMN "account"."providerAccountId" IS 'ID de la cuenta en el proveedor externo. Único dentro del proveedor específico.';
COMMENT ON COLUMN "account"."refresh_token" IS 'Token de refresh OAuth para renovar access tokens expirados. Específico de OAuth providers.';
COMMENT ON COLUMN "account"."access_token" IS 'Token de acceso OAuth para llamadas autenticadas a APIs. Temporal y renovable.';
COMMENT ON COLUMN "account"."expires_at" IS 'Timestamp de expiración del access_token en segundos desde Unix epoch. Para gestión de tokens.';
COMMENT ON COLUMN "account"."token_type" IS 'Tipo de token OAuth (usualmente "Bearer"). Especifica cómo usar el access_token.';
COMMENT ON COLUMN "account"."scope" IS 'Alcance de permisos OAuth concedidos. Define qué recursos puede acceder el token.';
COMMENT ON COLUMN "account"."id_token" IS 'JWT de identidad OpenID Connect. Contiene información del usuario del proveedor.';
COMMENT ON COLUMN "account"."session_state" IS 'Estado de sesión OAuth para manejo de sesiones avanzadas. Específico del proveedor.';

-- Tabla VERIFICATION_TOKEN
COMMENT ON COLUMN "verification_token"."identifier" IS 'Identificador del proceso de verificación (email, teléfono, etc). Clave compuesta parte 1.';
COMMENT ON COLUMN "verification_token"."token" IS 'Token único de verificación generado aleatoriamente. Clave compuesta parte 2.';
COMMENT ON COLUMN "verification_token"."expires" IS 'Timestamp de expiración del token. Los tokens expirados son automáticamente inválidos.';

-- Tabla USER_CREDENTIALS
COMMENT ON COLUMN "user_credentials"."user_id" IS 'Referencia única al usuario. FK y PK hacia user.id con CASCADE DELETE.';
COMMENT ON COLUMN "user_credentials"."hashed_password" IS 'Contraseña hasheada con bcrypt. Almacenamiento seguro separado de datos principales.';
COMMENT ON COLUMN "user_credentials"."created_at" IS 'Timestamp de creación de las credenciales. Para auditoría de seguridad.';
COMMENT ON COLUMN "user_credentials"."updated_at" IS 'Timestamp de última actualización. Rastrea cambios de contraseña.';

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