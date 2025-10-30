# Sistema de Base de Datos - Drizzle ORM

Esta carpeta contiene la implementación completa del sistema de base de datos usando Drizzle ORM para Aurora Nova.

## Estructura

```
src/lib/db/
├── connection.ts    # Configuración de conexión a PostgreSQL
├── schema.ts        # Esquemas Drizzle equivalentes al SQL
├── queries.ts       # Queries tipadas comunes
├── index.ts         # Exportaciones principales
└── README.md        # Esta documentación
```

## Tarea T004 Completada ✅

### ✅ Dependencias Instaladas
- `drizzle-orm` - ORM principal
- `drizzle-kit` - CLI y herramientas
- `pg` + `@types/pg` - Driver PostgreSQL
- `tsx` - Ejecución de scripts TypeScript
- `dotenv` - Variables de entorno

### ✅ Configuración Implementada

**connection.ts**
- Conexión lazy loading a PostgreSQL
- Pool de conexiones optimizado para desarrollo
- Funciones de verificación y testing
- Compatible con variables de entorno

**schema.ts**
- 7 tablas Drizzle equivalentes al schema.sql
- Tipos TypeScript completos (Select/Insert)
- Relaciones tipadas para joins
- Constraints y validaciones idénticas

**queries.ts**
- Queries comunes completamente tipadas
- Funciones helper para operaciones frecuentes
- Queries complejas con relaciones
- Utilidades de estadísticas

### ✅ Scripts Configurados

```bash
# Generar migraciones
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Push schema a BD (desarrollo)
npm run db:push

# Abrir Drizzle Studio
npm run db:studio

# Validar configuración
npm run db:check

# Poblar datos iniciales
npm run db:seed

# Probar configuración
npm run db:test

# Reset completo
npm run db:reset
```

### ✅ Migración Inicial
- Generada automáticamente desde esquemas Drizzle
- Compatible con schema.sql existente
- Incluye todas las tablas, índices y constraints
- Validada y funcionando

## Uso

### Importar DB
```typescript
import { db } from '@/lib/db';

// Query simple
const users = await db.select().from(userTable);

// Query con relaciones tipadas
const userWithRoles = await getUserWithRoles(userId);
```

### Queries Tipadas
```typescript
import { getUserById, userHasPermission, getSystemStats } from '@/lib/db';

const user = await getUserById('uuid-here');
const hasPermission = await userHasPermission(userId, 'user:create');
const stats = await getSystemStats();
```

### Esquemas y Tipos
```typescript
import type { User, InsertUser, UserWithRoles } from '@/lib/db';

const newUser: InsertUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
};
```

## Características Implementadas

### 🔒 Type Safety
- Queries 100% tipadas con TypeScript
- Autocompletado en IDE
- Validación en tiempo de compilación

### ⚡ Performance
- Conexión lazy loading
- Pool de conexiones optimizado
- Índices correctos según schema.sql

### 🛠️ Developer Experience
- Drizzle Studio para visualización
- Scripts npm para todas las operaciones
- Queries helper predefinidas

### 🔄 Migración Seamless
- Compatible con schema.sql existente
- Migración inicial ya generada
- Seeds TypeScript equivalentes

## Estado

- **T004**: ✅ **COMPLETADO** (2025-10-30)
- **Compatible con**: PostgreSQL 18+, UUID v7, todos los ADRs
- **Testing**: ✅ Conexión verificada, uuidv7() funcional, queries tipadas validadas
- **Próximo paso**: T006 (Configurar Lucia Auth)

El sistema está completamente funcional y listo para ser usado por Lucia Auth y el resto de la aplicación.

## Validación Final

```bash
# Test realizado: 2025-10-30
npm run db:test
# ✅ Conexión a PostgreSQL exitosa
# ✅ PostgreSQL 18+ verificado
# ✅ UUID v7 generado correctamente
# ✅ Estadísticas del sistema obtenidas
# 🎯 Drizzle ORM está configurado correctamente
```