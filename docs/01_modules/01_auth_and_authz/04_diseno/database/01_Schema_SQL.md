# Esquema SQL Completo (PostgreSQL 18+)

Este documento contiene los scripts `CREATE TABLE` para todas las tablas del sistema, estandarizadas con `UUID` como claves primarias y utilizando funciones nativas de PostgreSQL 18+.

## Tabla `user`
Almacena la información principal de los usuarios. El ID es generado por la aplicación (Lucia Auth).

```sql
CREATE TABLE "user" (
    "id" UUID PRIMARY KEY,
    "first_name" VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM("first_name")) > 0),
    "last_name" VARCHAR(255) NOT NULL CHECK (LENGTH(TRIM("last_name")) > 0),
    "email" VARCHAR(255) NOT NULL UNIQUE CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE
    ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Tablas de Autenticación (`session`, `key`)
El ID de sesión es generado por Lucia Auth. El ID de la llave es semántico.

```sql
CREATE TABLE "session" (
    "id" UUID PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "expires_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE "key" (
    "id" VARCHAR(255) PRIMARY KEY, -- ej: "email:user@example.com"
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "hashed_password" VARCHAR(255)
);
```

## Tablas de Roles y Permisos (`role`, `permission`)

```sql
CREATE TABLE "role" (
    "id" UUID PRIMARY KEY DEFAULT uuidv7(),
    "name" VARCHAR(50) NOT NULL UNIQUE CHECK (LENGTH(TRIM("name")) > 0),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "permission" (
    "id" VARCHAR(100) PRIMARY KEY CHECK ("id" ~* '^[a-z_]+:[a-z_]+$'), -- ej: "user:create"
    "module" VARCHAR(50) NOT NULL CHECK (LENGTH(TRIM("module")) > 0),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at en role
CREATE TRIGGER update_role_updated_at BEFORE UPDATE
    ON "role" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Tablas de Unión (Junction Tables)

```sql
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE RESTRICT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_by" UUID REFERENCES "user"("id"), -- Quien asignó el rol
    PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
    "permission_id" VARCHAR(100) NOT NULL REFERENCES "permission"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("role_id", "permission_id")
);
```
