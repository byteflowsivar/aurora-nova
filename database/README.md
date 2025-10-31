# Base de Datos - Aurora Nova

Esta carpeta contiene todos los scripts SQL para la gestión de la base de datos PostgreSQL del proyecto Aurora Nova.

## Filosofía de desarrollo

**Aurora Nova está en fase ALPHA.** Durante esta fase, el esquema de base de datos puede cambiar frecuentemente. Por esta razón:

- ✅ **`schema.sql` es la ÚNICA fuente de verdad** para la estructura de la base de datos
- ✅ NO hay scripts de migración (se agregarán cuando el proyecto esté estable)
- ✅ Los cambios se aplican reconstruyendo la base de datos desde cero
- ✅ Usa Docker para entornos de desarrollo aislados

## Archivos

### 1. `rollback.sql` 🔄 PRIMER PASO
Script para limpiar completamente la base de datos:
- 🧹 Elimina TODAS las tablas del sistema (9 tablas)
- 🧹 Elimina funciones y triggers
- ⚠️ **DESTRUCTIVO**: Los datos se pierden permanentemente
- ✅ Verificaciones antes y después de la limpieza
- ✅ Mensajes detallados del proceso

**Úsalo SIEMPRE antes de recrear el esquema en desarrollo**

### 2. `schema.sql` ⭐ FUENTE DE VERDAD
Script completo para crear el esquema de base de datos desde cero:
- ✅ 9 tablas del sistema (Auth.js + RBAC)
  - `user` - Usuarios del sistema (compatible con Auth.js)
  - `account` - Cuentas de proveedores OAuth/credentials
  - `session` - Sesiones activas de usuarios
  - `verification_token` - Tokens de verificación (email, reset password)
  - `user_credentials` - Credenciales de usuario (passwords hasheados)
  - `role` - Roles del sistema RBAC
  - `permission` - Permisos granulares con IDs semánticos
  - `user_role` - Tabla de unión usuarios-roles
  - `role_permission` - Tabla de unión roles-permisos
- ✅ Índices optimizados para rendimiento
- ✅ Constraints y validaciones de integridad
- ✅ Triggers para campos `updated_at`
- ✅ Comentarios completos de documentación
- ✅ Verificación de función `uuidv7()` (requiere PostgreSQL 18+)

### 3. `seeds.sql` 🌱 DATOS INICIALES
Script para poblar datos iniciales del sistema:
- ✅ 16 permisos base distribuidos en 3 módulos
  - **Users**: user:create, user:read, user:update, user:delete
  - **Roles**: role:create, role:read, role:update, role:delete, role:assign_permission, role:remove_permission
  - **Permissions**: permission:read, permission:assign, permission:remove, permission:create, permission:update, permission:delete
- ✅ 3 roles predefinidos:
  - **Super Administrador**: Todos los permisos
  - **Administrador**: Permisos limitados (gestión de usuarios y roles)
  - **Usuario**: Permisos básicos de lectura
- ✅ Asignación automática de permisos a roles
- ✅ Verificación de integridad de datos

### 4. `rebuild.sh` ⚡ AUTOMATIZACIÓN
Script bash para automatizar el flujo completo de reconstrucción:
- ⚡ Ejecuta rollback → schema → seeds automáticamente
- ✅ Verifica conexión a PostgreSQL antes de comenzar
- ⚠️ Solicita confirmación antes de eliminar datos
- 📊 Muestra progreso detallado con colores
- 🎯 Configurable vía variables de entorno

**Uso rápido en desarrollo:**
```bash
./database/rebuild.sh
```

### 5. `db-utils.sql` 🔧 UTILIDADES
Colección de consultas SQL útiles para desarrollo y debugging:
- 📊 Información del esquema (tablas, columnas, índices)
- 📊 Resumen de datos por tabla
- 📊 Consultas de roles y permisos
- 📊 Verificación de integridad referencial
- 📊 Consultas de rendimiento (tamaño de tablas, uso de índices)
- 📊 Consultas de seguridad (usuarios sin roles, sesiones expiradas, etc.)

## Uso

### Inicialización de la base de datos (primera vez)

```bash
# 1. Levantar PostgreSQL con Docker
docker compose up -d

# 2. Limpiar base de datos (si tiene datos previos)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/rollback.sql

# 3. Crear el esquema
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/schema.sql

# 4. Poblar datos iniciales
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/seeds.sql
```

### 🔄 Flujo de trabajo en desarrollo (IMPORTANTE)

**Cada vez que necesites hacer cambios en la base de datos:**

```bash
# PASO 1: Rollback (limpiar todo)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/rollback.sql

# PASO 2: Aplicar cambios en schema.sql (editar el archivo primero)

# PASO 3: Recrear esquema
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/schema.sql

# PASO 4: Poblar datos iniciales
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/seeds.sql
```

Este flujo garantiza que `schema.sql` siempre refleja el estado real de la base de datos.

### ⚡ Atajo: Script automatizado

Para hacer el flujo más rápido, usa el script de reconstrucción:

```bash
# Desde el directorio raíz del proyecto
./database/rebuild.sh

# O si estás en otra ubicación
cd /path/to/aurora-nova
./database/rebuild.sh
```

El script hace todo automáticamente:
1. Verifica la conexión a PostgreSQL
2. Solicita confirmación
3. Ejecuta rollback
4. Aplica schema
5. Carga seeds
6. Muestra resumen final

**Variables de entorno opcionales:**
```bash
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=aurora_nova_db \
DB_USER=aurora_user \
PGPASSWORD=changeme_in_production \
./database/rebuild.sh
```

### Debugging y consultas útiles

```bash
# Ver resumen de datos
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/db-utils.sql

# O ejecutar consultas específicas del archivo
# (copia la consulta que necesites y ejecútala)
```

## Requisitos

- **PostgreSQL 18+** (requerido para función nativa `uuidv7()`)
- **Docker & Docker Compose** (recomendado para desarrollo)
- Cliente `psql` instalado

## Verificación

Después de ejecutar `schema.sql`, deberías ver:

```
NOTICE:  uuidv7() función verificada correctamente
NOTICE:  Schema compatible con ADR-001 (PostgreSQL 18+), ADR-002 (UUID v7), ADR-003 (Permission semantic PK)
NOTICE:  Documentación completa aplicada con COMMENT en todos los objetos
```

Después de ejecutar `seeds.sql`, deberías tener:
- 3 roles
- 16 permisos
- 25 asignaciones de permisos a roles

## Decisiones de Arquitectura

Este esquema implementa las siguientes ADRs (Architecture Decision Records):

- **ADR-001**: PostgreSQL 18+ con soporte nativo para UUIDv7
- **ADR-002**: UUIDs v7 como identificadores primarios
- **ADR-003**: IDs semánticos para permisos (formato: `module:action`)
- **ADR-004**: Autenticación con Auth.js (compatible con OAuth y credentials)
- **ADR-005**: RBAC (Role-Based Access Control) para autorización

## Notas importantes

⚠️ **NO USES ESTOS SCRIPTS EN PRODUCCIÓN** sin antes:
1. Cambiar las credenciales de la base de datos
2. Configurar backups automáticos
3. Implementar un sistema de migraciones (cuando salga de alpha)
4. Revisar y ajustar los índices según patrones de uso real

🔒 **Seguridad**:
- Las contraseñas se hashean con bcrypt (factor 12)
- Los tokens de sesión se manejan por Auth.js
- Las foreign keys usan CASCADE o RESTRICT según el caso
- Los emails se validan con expresiones regulares

📝 **Documentación**:
- Todas las tablas, columnas, índices y triggers tienen comentarios SQL
- Usa `\dt+` en psql para ver descripciones de tablas
- Usa `\d+ nombre_tabla` para ver descripciones de columnas
