# Esquema SQL Completo (PostgreSQL)

Este documento contiene los scripts `CREATE TABLE` para todas las tablas del sistema, estandarizadas con `UUID` como claves primarias.

## Prerrequisitos: Función para UUID v7

Para generar UUIDs ordenables por tiempo (v7), se debe crear la siguiente función en la base de datos. Requiere la extensión `pgcrypto`.

```sql
-- Instalar la extensión si no está disponible
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para generar un UUID v7 (time-ordered)
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
    unix_ts_ms BIGINT;
    uuid_bytes BYTEA;
BEGIN
    unix_ts_ms = (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    uuid_bytes = gen_random_bytes(10);

    -- 6 bytes de timestamp
    uuid_bytes = SET_BYTE(uuid_bytes, 0, (unix_ts_ms >> 40) & 255);
    uuid_bytes = SET_BYTE(uuid_bytes, 1, (unix_ts_ms >> 32) & 255);
    uuid_bytes = SET_BYTE(uuid_bytes, 2, (unix_ts_ms >> 24) & 255);
    uuid_bytes = SET_BYTE(uuid_bytes, 3, (unix_ts_ms >> 16) & 255);
    uuid_bytes = SET_BYTE(uuid_bytes, 4, (unix_ts_ms >> 8) & 255);
    uuid_bytes = SET_BYTE(uuid_bytes, 5, unix_ts_ms & 255);

    -- 7mo byte: versión (0111)
    uuid_bytes = SET_BYTE(uuid_bytes, 6, (GET_BYTE(uuid_bytes, 0) & 15) | 112);

    -- 9no byte: variante (10)
    uuid_bytes = SET_BYTE(uuid_bytes, 8, (GET_BYTE(uuid_bytes, 2) & 63) | 128);

    RETURN ENCODE(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql;
```

## Tabla `user`
Almacena la información principal de los usuarios. El ID es generado por la aplicación (Lucia Auth).

```sql
CREATE TABLE "user" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    "name" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT
);

CREATE TABLE "permission" (
    "id" VARCHAR(100) PRIMARY KEY, -- ej: "user:create"
    "module" VARCHAR(50) NOT NULL,
    "description" TEXT
);
```

## Tablas de Unión (Junction Tables)

```sql
CREATE TABLE "user_role" (
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE RESTRICT,
    PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
    "permission_id" VARCHAR(100) NOT NULL REFERENCES "permission"("id") ON DELETE CASCADE,
    PRIMARY KEY ("role_id", "permission_id")
);
```
