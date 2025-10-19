# Índices y Rendimiento

Para cumplir con el requerimiento no funcional `PERF-01` (tiempo de respuesta p95 < 500ms), se define la siguiente estrategia de indexación.

PostgreSQL crea automáticamente índices para las restricciones `PRIMARY KEY` and `UNIQUE`. Los siguientes índices adicionales son necesarios para optimizar las operaciones de `JOIN` y las búsquedas (`WHERE`).

## Índices en Claves Foráneas (FK)

Es una buena práctica crear índices en todas las claves foráneas para acelerar las operaciones de `JOIN` y evitar bloqueos de tabla en operaciones `ON DELETE`.

```sql
-- Índice para buscar sesiones por usuario
CREATE INDEX "idx_session_user_id" ON "session"("user_id");

-- Índice para buscar llaves por usuario
CREATE INDEX "idx_key_user_id" ON "key"("user_id");

-- Índices para la tabla de unión user_role
CREATE INDEX "idx_user_role_user_id" ON "user_role"("user_id");
CREATE INDEX "idx_user_role_role_id" ON "user_role"("role_id");

-- Índices para la tabla de unión role_permission
CREATE INDEX "idx_role_permission_role_id" ON "role_permission"("role_id");
CREATE INDEX "idx_role_permission_permission_id" ON "role_permission"("permission_id");
```

## Justificación

- **`idx_session_user_id`**: Esencial para validar rápidamente las sesiones activas de un usuario.
- **`idx_key_user_id`**: Crítico para el proceso de login, donde se busca la `key` a partir del `user_id` que se obtiene al buscar por email.
- **Índices en tablas de unión**: Aceleran la obtención de todos los roles de un usuario y todos los permisos de un rol, operaciones que se realizarán constantemente en el middleware de autorización.
