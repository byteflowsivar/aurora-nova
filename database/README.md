# Base de Datos - Aurora Nova

Esta carpeta contiene todos los scripts SQL para la gestión de la base de datos PostgreSQL del proyecto Aurora Nova.

## Archivos

### `schema.sql`
Script completo para crear el esquema de base de datos desde cero:
- ✅ 7 tablas principales del sistema auth
- ✅ Índices optimizados para rendimiento
- ✅ Constraints y validaciones de integridad
- ✅ Triggers para campos `updated_at`
- ✅ Comentarios de documentación
- ✅ Verificación de función `uuidv7()`

### `seeds.sql`
Script para poblar datos iniciales del sistema:
- ✅ 16 permisos base distribuidos en 3 módulos
- ✅ 3 roles predefinidos (Super Administrador, Administrador, Usuario)
- ✅ Asignación automática de permisos a roles
- ✅ Verificación de integridad de datos

### `rollback.sql`
Script DESTRUCTIVO para eliminar completamente el esquema:
- 🚨 Elimina TODAS las tablas y datos
- 🚨 Elimina funciones, triggers e índices
- 🚨 NO es reversible - los datos se pierden permanentemente
- ✅ Verificaciones de estado antes y después
- ✅ Mensajes detallados del proceso

### `schema-comments.sql`
Script complementario con comentarios detallados:
- 📝 Comentarios para todas las tablas y columnas
- 📝 Documentación de índices y constraints
- 📝 Información de funciones y triggers
- 📝 Metadata del esquema y compliance con ADRs

### `db-utils.sql`
Consultas útiles para desarrollo y debugging:
- 🔍 Información general del esquema
- 📊 Consultas de datos y estadísticas
- 🔧 Validación de integridad referencial
- ⚡ Consultas de rendimiento y uso de índices

## Estructura de Tablas Creadas

```
user                    # Usuarios del sistema
├── session            # Sesiones activas (Lucia Auth)
├── key                # Claves de autenticación (Lucia Auth)
└── user_role          # Relación usuarios-roles

role                    # Roles del sistema
├── role_permission    # Relación roles-permisos
└── user_role          # Relación usuarios-roles

permission              # Permisos granulares
└── role_permission    # Relación roles-permisos
```

## Datos Iniciales Creados

### Permisos (16 total)
- **Users** (5): create, read, update, delete, list
- **Roles** (6): create, read, update, delete, list, assign
- **Permissions** (5): create, read, update, delete, list

### Roles (3 total)
- **Super Administrador**: 16 permisos (todos)
- **Administrador**: 7 permisos (lectura y gestión limitada)
- **Usuario**: 2 permisos (solo lectura básica)

## Comandos de Gestión

```bash
# Crear esquema completo (incluye comentarios básicos)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f schema.sql

# Poblar datos iniciales
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f seeds.sql

# Aplicar comentarios detallados (opcional)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f schema-comments.sql

# ⚠️ ELIMINAR TODO (DESTRUCTIVO - solo desarrollo)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f rollback.sql

# Verificar estructura
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -c "\dt"

# Ejecutar consultas de debugging
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f db-utils.sql

# Ver roles y permisos
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -c "
  SELECT r.name, COUNT(rp.permission_id) as permisos
  FROM role r
  LEFT JOIN role_permission rp ON r.id = rp.role_id
  GROUP BY r.name
  ORDER BY permisos DESC;
"
```

## Flujo de Trabajo Recomendado

```bash
# 1. Setup inicial completo
./schema.sql && ./seeds.sql

# 2. Durante desarrollo (reiniciar desde cero)
./rollback.sql && ./schema.sql && ./seeds.sql

# 3. Para debugging y análisis
./db-utils.sql

# 4. Para documentación completa
./schema-comments.sql
```

## Características Implementadas

### ✅ Cumplimiento de ADRs
- **ADR-002**: UUID v7 como PK en todas las tablas principales
- **ADR-003**: Clave primaria semántica en tabla `permission`
- **ADR-001**: PostgreSQL 18+ con función nativa `uuidv7()`

### ✅ Seguridad y Validaciones
- Constraints de integridad referencial
- Validación de formato de email con regex
- Validación de campos no vacíos
- Validación de formato de permisos (`module:action`)

### ✅ Rendimiento
- Índices optimizados en columnas frecuentemente consultadas
- Triggers automáticos para `updated_at`
- Estructura normalizada pero eficiente

### ✅ Auditoría
- Campos `created_at` en todas las tablas
- Campo `created_by` en asignaciones de roles
- Timestamps automáticos con zona horaria

## Estado de Implementación

**Tarea T003**: ✅ **COMPLETADA**
- Schema SQL ejecutado correctamente
- Datos iniciales poblados
- Verificaciones de integridad pasadas
- Base de datos lista para T004 (migraciones) y T006 (Lucia Auth)

## Próximos Pasos

Según el plan de trabajo:
1. **T004**: Configurar ORM y sistema de migraciones
2. **T005**: Script CLI para crear Super Admin (datos ya están)
3. **T006**: Instalar y configurar Lucia Auth