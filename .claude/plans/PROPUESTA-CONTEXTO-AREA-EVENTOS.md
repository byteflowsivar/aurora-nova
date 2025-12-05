# Propuesta: Agregar Contexto de Área a Sistema de Eventos

**Fecha:** 2025-12-04
**Rama:** feature/fase-5-mustache-templates
**Estado:** Propuesta - Pendiente de Aprobación

---

## 1. Problema Identificado

Actualmente, cuando se registra un evento en el sistema:

```typescript
// Ejemplo actual
await eventBus.dispatch(
  SystemEvent.USER_CREATED,
  {
    userId: 'user-123',
    email: 'user@example.com',
    name: 'John Doe',
    createdBy: 'admin-456', // ID de quién lo creó
  },
  {
    requestId: 'req-789',
    userId: 'admin-456', // ID de quién disparó
  }
);
```

**Limitación:** No se registra explícitamente **desde qué área de la aplicación** se disparó el evento. Esto dificulta:

- 📊 Auditoría segmentada por zona: Admin, Customer, Public
- 🎯 Análisis de actividad por contexto
- 📧 Selección inteligente de templates de email según contexto
- 🔐 Validaciones de seguridad basadas en el contexto
- 🗂️ Organización futura de eventos por zona

**Ejemplo de necesidad real:**

```
Evento: USER_CREATED
Contexto actual: No sabemos si fue creado por:
  - Admin panel: /admin/users/create
  - API pública: /api/public/register
  - Importación batch: /api/admin/import-users

Resultado: El email de bienvenida es idéntico sin importar el contexto
```

---

## 2. Solución Propuesta

### 2.1 Agregar Enum de Áreas

```typescript
// src/lib/events/event-area.ts
export enum EventArea {
  // Área administrativa
  ADMIN = 'admin',

  // Área de cliente/usuario
  CUSTOMER = 'customer',

  // Área pública
  PUBLIC = 'public',

  // Área de sistema/interno
  SYSTEM = 'system',
}
```

### 2.2 Extender Metadata del Evento

```typescript
// src/lib/events/types.ts - ACTUALIZAR

export interface BaseEvent<T extends SystemEvent> {
  event: T;
  payload: EventPayload[T];

  metadata: {
    timestamp: Date;
    requestId?: string;
    userId?: string;
    area?: EventArea;  // 👈 NUEVO CAMPO
  };
}
```

### 2.3 Actualizar EventBus

```typescript
// src/lib/events/event-bus.ts

async dispatch<T extends SystemEvent>(
  event: T,
  payload: EventPayload[T],
  metadata?: {
    requestId?: string;
    userId?: string;
    area?: EventArea;  // 👈 NUEVO PARÁMETRO
  }
): Promise<void> {
  // Validar y normalizar área
  const normalizedMetadata = {
    timestamp: new Date(),
    requestId: metadata?.requestId,
    userId: metadata?.userId,
    area: metadata?.area ?? EventArea.SYSTEM, // Default a SYSTEM
  };

  const event_obj: BaseEvent<T> = {
    event,
    payload,
    metadata: normalizedMetadata,
  };

  // ... resto de la lógica
}
```

---

## 3. Impactos en Componentes Existentes

### 3.1 Audit Listener

**Cambio:** El registro de auditoría incluirá el campo `area`

```typescript
// Antes
await auditService.log({
  userId: event.payload.userId,
  action: 'create',
  module: 'users',
  // ... otros campos
});

// Después
await auditService.log({
  userId: event.payload.userId,
  action: 'create',
  module: 'users',
  area: event.metadata.area, // 👈 NUEVO
  // ... otros campos
});
```

**Schema Prisma actualizado:**

```prisma
model AuditLog {
  // ... campos existentes ...
  area      String? @db.VarChar(50)  // 'admin', 'customer', 'public', 'system'
  // ... resto de campos ...

  @@index([area], map: "idx_audit_log_area")
}
```

### 3.2 Email Listener

**Cambio:** Seleccionar template según el área

```typescript
// Ejemplo: Bienvenida diferente según contexto
private async sendWelcomeEmail(payload: ..., area: EventArea) {
  let templatePath: string;

  switch (area) {
    case EventArea.ADMIN:
      templatePath = 'templates/admin/email/welcome.mustache';
      break;
    case EventArea.CUSTOMER:
      templatePath = 'templates/customer/email/welcome.mustache';
      break;
    case EventArea.PUBLIC:
      templatePath = 'templates/public/email/welcome.mustache';
      break;
    default:
      templatePath = 'templates/admin/email/welcome.mustache';
  }

  // ... renderizar y enviar
}
```

### 3.3 Puntos de Dispatch

**Cambio:** Pasar `area` al dispara evento

```typescript
// Ejemplo 1: Creación de usuario desde admin
// Ubicación: src/app/admin/users/actions.ts
await eventBus.dispatch(
  SystemEvent.USER_CREATED,
  { /* payload */ },
  {
    userId: currentUser.id,
    requestId: context.requestId,
    area: EventArea.ADMIN,  // 👈 NUEVO
  }
);

// Ejemplo 2: Registro público
// Ubicación: src/actions/auth.ts
await eventBus.dispatch(
  SystemEvent.USER_REGISTERED,
  { /* payload */ },
  {
    userId: user.id,
    requestId: context.requestId,
    area: EventArea.PUBLIC,  // 👈 NUEVO
  }
);
```

---

## 4. Categorización de Eventos por Área

| Evento | Admin | Customer | Public | System |
|--------|-------|----------|--------|--------|
| `USER_REGISTERED` | ❌ | ❌ | ✅ | - |
| `USER_LOGGED_IN` | ✅ | ✅ | ✅ | - |
| `USER_LOGGED_OUT` | ✅ | ✅ | ✅ | - |
| `PASSWORD_RESET_REQUESTED` | ✅ | ✅ | ✅ | - |
| `PASSWORD_CHANGED` | ✅ | ✅ | ✅ | - |
| `USER_CREATED` | ✅ | ❌ | ❌ | - |
| `USER_UPDATED` | ✅ | Parcial | ❌ | - |
| `USER_DELETED` | ✅ | ❌ | ❌ | - |
| `USER_ROLE_ASSIGNED` | ✅ | ❌ | ❌ | - |
| `USER_ROLE_REMOVED` | ✅ | ❌ | ❌ | - |
| `ROLE_CREATED` | ✅ | ❌ | ❌ | - |
| `ROLE_UPDATED` | ✅ | ❌ | ❌ | - |
| `ROLE_DELETED` | ✅ | ❌ | ❌ | - |
| `ROLE_PERMISSION_ASSIGNED` | ✅ | ❌ | ❌ | - |
| `ROLE_PERMISSION_REMOVED` | ✅ | ❌ | ❌ | - |
| `PERMISSION_CREATED` | ✅ | ❌ | ❌ | - |
| `PERMISSION_UPDATED` | ✅ | ❌ | ❌ | - |
| `PERMISSION_DELETED` | ✅ | ❌ | ❌ | - |
| `SESSION_EXPIRED` | - | - | - | ✅ |
| `CONCURRENT_SESSION_DETECTED` | - | - | - | ✅ |

---

## 5. Archivos a Modificar

### 5.1 Nuevos Archivos

```
src/lib/events/
├── event-area.ts              ← CREAR: Enum de áreas
```

### 5.2 Archivos a Actualizar

```
src/lib/events/
├── types.ts                   ← Actualizar: BaseEvent.metadata.area
├── event-bus.ts               ← Actualizar: dispatch() signature
├── listeners/
│   ├── audit-listener.ts      ← Actualizar: Registrar area en AuditLog
│   └── email-listener.ts      ← Actualizar: Seleccionar template por area

src/modules/admin/services/
├── audit-service.ts           ← Actualizar: Aceptar area
└── audit-types.ts             ← Actualizar: AuditLogInput.area

src/actions/
├── auth.ts                    ← Actualizar: Dispatch con area
└── (otros archivos de acciones)

src/app/api/
├── (todos los routes)         ← Actualizar: Dispatch con area

prisma/
└── schema.prisma              ← Actualizar: AuditLog.area
```

### 5.3 Tests a Actualizar

```
src/__tests__/
├── unit/
│   ├── event-bus.test.ts      ← Tests con area
│   ├── audit-listener.test.ts ← Tests con area
│   └── email-listener.test.ts ← Tests con area
├── integration/
│   └── audit-api.test.ts      ← Tests con area
```

---

## 6. Plan de Implementación

### Fase 1: Definición de Tipos (1-2 commits)

1. Crear `event-area.ts` con enum `EventArea`
2. Actualizar tipos en `types.ts` para incluir `area` en metadata
3. Documentar categorización de eventos

### Fase 2: Infraestructura (2-3 commits)

1. Actualizar `event-bus.ts` para aceptar y validar `area`
2. Actualizar `audit-service.ts` para aceptar `area`
3. Actualizar schema Prisma con campo `area` en `AuditLog`
4. Crear migración de BD

### Fase 3: Listeners (2 commits)

1. Actualizar `audit-listener.ts` para registrar `area`
2. Actualizar `email-listener.ts` para seleccionar template por `area`

### Fase 4: Refactoring de Dispatch (3-5 commits)

1. Actualizar `src/actions/auth.ts`
2. Actualizar `src/app/api/**/route.ts` files
3. Actualizar `src/modules/admin/services/**` files

### Fase 5: Testing (2-3 commits)

1. Actualizar tests unitarios
2. Actualizar tests de integración
3. Agregar nuevos tests para validar `area`

### Fase 6: Documentación (1 commit)

1. Crear/actualizar docs sobre contexto de área
2. Agregar ejemplos de uso

---

## 7. Beneficios Esperados

✅ **Auditoría Mejorada**
- Filtrar por área: `await auditService.getLogs({ area: 'admin' })`
- Analizar actividad por zona
- Detectar anomalías por contexto

✅ **Emails Personalizados**
- Diferentes templates según contexto
- Mensajes más relevantes para cada zona
- Posibilidad de diferentes proveedores por área

✅ **Seguridad**
- Validar que eventos solo provengan del área esperada
- Detectar intentos de escalada de privileios
- Auditar acciones cruzadas entre áreas

✅ **Observabilidad**
- Logs estructurados con área
- Dashboards por contexto
- Correlación de eventos por zona

✅ **Escalabilidad Futura**
- Estructura lista para nuevas áreas (marketplace, integraciones)
- Fácil agregar nuevos contextos sin modificar core

---

## 8. Compatibilidad hacia Atrás

⚠️ **Breaking Change:** Sí, pero manejable

```typescript
// Campo area es OPCIONAL en metadata
metadata?: {
  requestId?: string;
  userId?: string;
  area?: EventArea;  // Opcional, default: SYSTEM
}

// Los eventos sin area se registran con area: undefined
// Las queries pueden filtrar: area IS NOT NULL
```

**Migración:**
1. Hacer `area` opcional durante la transición
2. Registrar eventos sin especificar area → se guardan como `undefined`
3. Después, hacer area requerido en nuevos eventos
4. Datos históricos seguirán siendo consultables

---

## 9. Ejemplo de Uso Completo

### Antes (Actual)

```typescript
// Crear usuario desde admin panel
async function createAdminUser(data: CreateUserInput) {
  const user = await prisma.user.create({ data: {...} });

  await eventBus.dispatch(
    SystemEvent.USER_CREATED,
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdBy: currentUser.id,
    },
    { userId: currentUser.id }
  );
}
```

### Después (Propuesta)

```typescript
// Crear usuario desde admin panel
async function createAdminUser(data: CreateUserInput) {
  const user = await prisma.user.create({ data: {...} });

  await eventBus.dispatch(
    SystemEvent.USER_CREATED,
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdBy: currentUser.id,
    },
    {
      userId: currentUser.id,
      area: EventArea.ADMIN,  // ← NUEVO
    }
  );
}

// Auditoría registra:
// {
//   userId: 'admin-456',
//   action: 'create',
//   module: 'users',
//   area: 'admin',        // ← Nuevo campo
//   entityType: 'User',
//   entityId: 'user-123',
//   // ...
// }

// Email es personalizado por contexto:
// Si area = 'admin' → usa templates/admin/email/welcome-admin.mustache
// Si area = 'public' → usa templates/public/email/welcome-user.mustache
```

---

## 10. Decisiones Necesarias

### ❓ Pregunta 1: ¿Implementar ahora o después?

**Opciones:**
- **A) Antes de Fase 5:** Incluir `area` en refactoring de eventos (cambio pequeño)
- **B) Después de Fase 5:** Como Fase 6 separada (cambio más grande después)

**Recomendación:** **Opción A** - Es cambio pequeño y mejora significativamente la auditoría

### ❓ Pregunta 2: ¿Incluir en tests de Fase 5?

**Opciones:**
- **A) Sí:** Tests completos con `area` desde el principio
- **B) No:** Tests básicos ahora, agregar tests de `area` después

**Recomendación:** **Opción A** - Muy poco trabajo adicional

### ❓ Pregunta 3: ¿Qué hacer con templates de email?

**Opciones:**
- **A) Crear templates por área:** `admin/email/welcome.mustache`, `customer/email/welcome.mustache`
- **B) Usar mismo template, pero variar variables:** Un solo `welcome.mustache` pero diferentes contextos

**Recomendación:** **Opción A** - Mucho más flexible para el futuro

---

## 11. Checklist de Aprobación

- [X] Entiendes el problema de falta de contexto
- [X] La solución te parece adecuada
- [X] Los archivos a modificar están correctos
- [X] Apruebas implementar antes de completar Fase 5
- [X] Apruebas agregar área a tests

---

## 12. Próximos Pasos

1. **Tu revisión:** Verifica propuesta, planifica cambios
2. **Mi confirmación:** Ajusto según feedback
3. **Implementación:** Crear rama `feature/event-area-context`
4. **Integración:** Merge antes de completar Fase 5

---

**¿Aprobada la propuesta?** → Procederemos con la implementación en paralelo con Fase 5.
