-- Script de comentarios completos para el esquema Aurora Nova
-- Este script agrega comentarios detallados a todos los objetos de la base de datos

-- ============================================================================
-- COMENTARIOS DE TABLAS
-- ============================================================================

COMMENT ON TABLE "user" IS 'Tabla principal de usuarios del sistema. Contiene la información básica de identificación y estado de cada usuario registrado.';

COMMENT ON TABLE "session" IS 'Sesiones activas manejadas por Lucia Auth. Cada registro representa una sesión válida de usuario con su tiempo de expiración.';

COMMENT ON TABLE "key" IS 'Claves de autenticación (email/password, OAuth, etc.). Tabla de Lucia Auth para manejar diferentes métodos de autenticación por usuario.';

COMMENT ON TABLE "role" IS 'Roles del sistema para control de acceso basado en roles (RBAC). Define los diferentes niveles de acceso en la aplicación.';

COMMENT ON TABLE "permission" IS 'Permisos granulares con IDs semánticos. Define las acciones específicas que pueden realizar los usuarios (ej: user:create, role:delete).';

COMMENT ON TABLE "user_role" IS 'Tabla de unión para asignación de roles a usuarios. Relación muchos-a-muchos entre usuarios y roles con auditoría.';

COMMENT ON TABLE "role_permission" IS 'Tabla de unión para asignación de permisos a roles. Define qué permisos específicos tiene cada rol del sistema.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA USER
-- ============================================================================

COMMENT ON COLUMN "user"."id" IS 'Clave primaria UUID generada por Lucia Auth. Identificador único inmutable del usuario.';

COMMENT ON COLUMN "user"."first_name" IS 'Nombre(s) del usuario. Campo requerido con validación de longitud mínima.';

COMMENT ON COLUMN "user"."last_name" IS 'Apellido(s) del usuario. Campo requerido con validación de longitud mínima.';

COMMENT ON COLUMN "user"."email" IS 'Dirección de correo electrónico única del usuario. Utilizada para autenticación y comunicación.';

COMMENT ON COLUMN "user"."email_verified" IS 'Indica si el email del usuario ha sido verificado. Por defecto FALSE hasta confirmación.';

COMMENT ON COLUMN "user"."created_at" IS 'Timestamp de creación del registro. Se establece automáticamente al insertar.';

COMMENT ON COLUMN "user"."updated_at" IS 'Timestamp de última actualización. Se actualiza automáticamente vía trigger.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA SESSION
-- ============================================================================

COMMENT ON COLUMN "session"."id" IS 'Clave primaria UUID de la sesión generada por Lucia Auth. Token de sesión opaco.';

COMMENT ON COLUMN "session"."user_id" IS 'Referencia al usuario propietario de la sesión. FK hacia user.id con CASCADE DELETE.';

COMMENT ON COLUMN "session"."expires_at" IS 'Fecha y hora de expiración de la sesión. Las sesiones expiradas son inválidas automáticamente.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA KEY
-- ============================================================================

COMMENT ON COLUMN "key"."id" IS 'Identificador semántico de la clave (ej: "email:user@domain.com"). PK compuesta por tipo y valor.';

COMMENT ON COLUMN "key"."user_id" IS 'Referencia al usuario propietario de esta clave de autenticación. FK hacia user.id.';

COMMENT ON COLUMN "key"."hashed_password" IS 'Contraseña hasheada con bcrypt. Nullable para proveedores OAuth que no requieren contraseña local.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA ROLE
-- ============================================================================

COMMENT ON COLUMN "role"."id" IS 'Clave primaria UUID v7 auto-generada. Identificador único del rol siguiendo ADR-002.';

COMMENT ON COLUMN "role"."name" IS 'Nombre único del rol (ej: "Super Administrador", "Editor"). Usado para display y referencias.';

COMMENT ON COLUMN "role"."description" IS 'Descripción detallada del propósito y alcance del rol. Campo opcional para documentación.';

COMMENT ON COLUMN "role"."created_at" IS 'Timestamp de creación del rol. Auditoría de cuándo se definió el rol.';

COMMENT ON COLUMN "role"."updated_at" IS 'Timestamp de última modificación del rol. Se actualiza vía trigger automático.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA PERMISSION
-- ============================================================================

COMMENT ON COLUMN "permission"."id" IS 'ID semántico del permiso (ej: "user:create", "role:delete") según ADR-003. PK varchar para legibilidad.';

COMMENT ON COLUMN "permission"."module" IS 'Módulo al que pertenece el permiso (ej: "Users", "Roles"). Agrupa permisos relacionados.';

COMMENT ON COLUMN "permission"."description" IS 'Descripción legible del permiso. Explica qué acción específica autoriza.';

COMMENT ON COLUMN "permission"."created_at" IS 'Timestamp de creación del permiso. Los permisos son generalmente inmutables.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA USER_ROLE
-- ============================================================================

COMMENT ON COLUMN "user_role"."user_id" IS 'Referencia al usuario. Parte de la PK compuesta, FK hacia user.id con CASCADE DELETE.';

COMMENT ON COLUMN "user_role"."role_id" IS 'Referencia al rol asignado. Parte de la PK compuesta, FK hacia role.id con RESTRICT DELETE.';

COMMENT ON COLUMN "user_role"."created_at" IS 'Timestamp de asignación del rol. Auditoría de cuándo se otorgó el acceso.';

COMMENT ON COLUMN "user_role"."created_by" IS 'Usuario que realizó la asignación del rol. FK nullable hacia user.id para auditoría.';

-- ============================================================================
-- COMENTARIOS DE COLUMNAS - TABLA ROLE_PERMISSION
-- ============================================================================

COMMENT ON COLUMN "role_permission"."role_id" IS 'Referencia al rol. Parte de la PK compuesta, FK hacia role.id con CASCADE DELETE.';

COMMENT ON COLUMN "role_permission"."permission_id" IS 'Referencia al permiso otorgado. Parte de la PK compuesta, FK hacia permission.id.';

COMMENT ON COLUMN "role_permission"."created_at" IS 'Timestamp de asignación del permiso al rol. Auditoría de configuración de permisos.';

-- ============================================================================
-- COMENTARIOS DE ÍNDICES
-- ============================================================================

COMMENT ON INDEX "idx_user_email" IS 'Índice único en email para búsquedas rápidas durante autenticación y validación de unicidad.';

COMMENT ON INDEX "idx_session_user_id" IS 'Índice en user_id para consultas eficientes de sesiones por usuario.';

COMMENT ON INDEX "idx_session_expires_at" IS 'Índice en expires_at para limpieza eficiente de sesiones expiradas.';

COMMENT ON INDEX "idx_key_user_id" IS 'Índice en user_id para consultas rápidas de claves de autenticación por usuario.';

COMMENT ON INDEX "idx_user_role_user_id" IS 'Índice en user_id para consultas eficientes de roles por usuario.';

COMMENT ON INDEX "idx_user_role_role_id" IS 'Índice en role_id para consultas de usuarios por rol.';

COMMENT ON INDEX "idx_role_permission_role_id" IS 'Índice en role_id para consultas rápidas de permisos por rol.';

COMMENT ON INDEX "idx_role_permission_permission_id" IS 'Índice en permission_id para consultas de roles que tienen un permiso específico.';

COMMENT ON INDEX "idx_permission_module" IS 'Índice en module para agrupación y filtrado eficiente de permisos por módulo.';

-- ============================================================================
-- COMENTARIOS DE CONSTRAINTS
-- ============================================================================

COMMENT ON CONSTRAINT "user_email_check" ON "user" IS 'Validación de formato de email con expresión regular RFC compliant.';

COMMENT ON CONSTRAINT "user_first_name_check" ON "user" IS 'Validación de que first_name no esté vacío después de trim.';

COMMENT ON CONSTRAINT "user_last_name_check" ON "user" IS 'Validación de que last_name no esté vacío después de trim.';

COMMENT ON CONSTRAINT "role_name_check" ON "role" IS 'Validación de que el nombre del rol no esté vacío después de trim.';

COMMENT ON CONSTRAINT "permission_id_check" ON "permission" IS 'Validación de formato semántico module:action para IDs de permisos (ADR-003).';

COMMENT ON CONSTRAINT "permission_module_check" ON "permission" IS 'Validación de que el módulo no esté vacío después de trim.';

-- ============================================================================
-- COMENTARIOS DE FUNCIONES Y TRIGGERS
-- ============================================================================

COMMENT ON FUNCTION update_updated_at_column() IS 'Función trigger para actualizar automáticamente la columna updated_at con NOW() en cada UPDATE.';

COMMENT ON TRIGGER update_user_updated_at ON "user" IS 'Trigger que actualiza automáticamente updated_at en la tabla user antes de cada UPDATE.';

COMMENT ON TRIGGER update_role_updated_at ON "role" IS 'Trigger que actualiza automáticamente updated_at en la tabla role antes de cada UPDATE.';

-- ============================================================================
-- METADATA DEL ESQUEMA
-- ============================================================================

-- Comentario general del esquema
COMMENT ON SCHEMA public IS 'Esquema principal de Aurora Nova - Sistema de autenticación y autorización basado en roles (RBAC) usando Lucia Auth y PostgreSQL 18+.';

-- Información de versión y compliance
DO $$
BEGIN
    -- Agregar metadata como comentarios extendidos
    PERFORM pg_catalog.obj_description(
        pg_catalog.pg_class.oid, 'pg_class'
    ) FROM pg_catalog.pg_class WHERE relname = 'user';

    RAISE NOTICE 'Comentarios de documentación aplicados correctamente';
    RAISE NOTICE 'Schema compatible con ADR-001 (PostgreSQL 18+), ADR-002 (UUID v7), ADR-003 (Permission semantic PK)';
END $$;