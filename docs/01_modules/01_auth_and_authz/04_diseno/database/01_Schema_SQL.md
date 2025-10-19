# Esquema SQL Completo (PostgreSQL)

Este documento contiene los scripts `CREATE TABLE` para todas las tablas del sistema.

## Tabla `user`
Almacena la información principal de los usuarios.

```sql
CREATE TABLE "user" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Tablas de Autenticación (`session`, `key`)
Basadas en los requerimientos de Lucia Auth.

```sql
-- Almacena las sesiones de los usuarios
CREATE TABLE "session" (
    "id" VARCHAR(255) PRIMARY KEY,
    "user_id" VARCHAR(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "expires_at" TIMESTAMPTZ NOT NULL
);

-- Almacena las credenciales (ej. contraseña)
CREATE TABLE "key" (
    "id" VARCHAR(255) PRIMARY KEY, -- ej: "email:user@example.com"
    "user_id" VARCHAR(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "hashed_password" VARCHAR(255)
);
```

## Tablas de Roles y Permisos (`role`, `permission`)

```sql
-- Define los roles del sistema
CREATE TABLE "role" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT
);

-- Catálogo de todos los permisos disponibles en la aplicación
CREATE TABLE "permission" (
    "id" VARCHAR(100) PRIMARY KEY, -- ej: "user:create"
    "module" VARCHAR(50) NOT NULL,
    "description" TEXT
);
```

## Tablas de Unión (Junction Tables)

```sql
-- Asigna un rol a un usuario
CREATE TABLE "user_role" (
    "user_id" VARCHAR(255) NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role_id" INTEGER NOT NULL REFERENCES "role"("id") ON DELETE RESTRICT,
    PRIMARY KEY ("user_id", "role_id")
);

-- Asigna un permiso a un rol
CREATE TABLE "role_permission" (
    "role_id" INTEGER NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
    "permission_id" VARCHAR(100) NOT NULL REFERENCES "permission"("id") ON DELETE CASCADE,
    PRIMARY KEY ("role_id", "permission_id")
);
```
