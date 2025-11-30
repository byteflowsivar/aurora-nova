# Plan de Mejoras para Application Base
# Aurora Nova - Logging, Eventos y Auditoría

**Proyecto**: Aurora Nova - Application Base
**Fecha de Creación**: 2025-11-30
**Versión Base**: Next.js 16.0.5
**Objetivo**: Mejorar la aplicación base con sistemas de logging, eventos y auditoría estandarizados

---

## 📊 Resumen Ejecutivo

Este plan establece la implementación de tres pilares fundamentales para convertir Aurora Nova en una base sólida y reutilizable para múltiples aplicaciones:

1. **Sistema de Logging Estandarizado**: Logs estructurados con contexto rico para debugging y monitoreo
2. **Sistema de Eventos (Event-Driven)**: Arquitectura desacoplada para notificaciones y acciones reactivas
3. **Sistema de Auditoría**: Registro completo de acciones de usuarios para trazabilidad y compliance

### Tiempo Estimado Total
- **Fase 1 - Logging**: 4-6 horas
- **Fase 2 - Sistema de Eventos**: 6-8 horas
- **Fase 3 - Auditoría**: 8-10 horas
- **Fase 4 - Integración y Testing**: 4-6 horas
- **Total**: 22-30 horas (~3-4 días)

### Complejidad
🟡 **Media**: Requiere cambios arquitecturales pero sin breaking changes

---

## 🎯 Análisis de Viabilidad

### 1. Sistema de Logging Estandarizado

#### Estado Actual
```typescript
// src/lib/logger.ts (Actual)
- ✅ Pino configurado básicamente
- ❌ Sin contexto estandarizado
- ❌ Sin metadata estructurada
- ❌ Sin correlación de requests
- ❌ Sin niveles de log apropiados por módulo
```

#### ¿Es Viable?
**✅ SÍ - Alta Viabilidad**

**Razones**:
- Ya usa Pino (excelente logger de producción)
- Next.js 16 compatible
- No requiere cambios en BD
- Retrocompatible (wrapper sobre Pino existente)

**Beneficios**:
- Debugging más rápido
- Monitoreo en producción
- Correlación de requests HTTP
- Trazabilidad de operaciones

**Trade-offs**:
- Pequeño overhead en performance (~1-2%)
- Más verbose en logs (bueno para producción)

---

### 2. Sistema de Eventos (Event-Driven Architecture)

#### Estado Actual
```typescript
// Actualmente: Acoplamiento directo
// src/actions/auth.ts
async function login() {
  // ... lógica de login
  await sendEmail(...) // ❌ Acoplado directamente
}
```

#### ¿Es Viable?
**✅ SÍ - Alta Viabilidad**

**Razones**:
- Patrón establecido en Node.js (EventEmitter)
- Compatible con Next.js Server Actions
- Permite extensibilidad sin modificar código existente
- Ideal para aplicación base reutilizable

**Beneficios**:
- Desacoplamiento total
- Fácil agregar nuevos listeners
- Testing más simple (mock de eventos)
- Escalabilidad (futuros: queues, webhooks)

**Arquitectura Propuesta**:
```typescript
// Event-driven flow
login() -> emit("user.logged_in") -> [EmailListener, AuditListener, NotificationListener]
```

**Trade-offs**:
- Necesita gestión de errores en listeners
- Debugging ligeramente más complejo
- Requiere documentación de eventos

---

### 3. Sistema de Auditoría

#### Estado Actual
```typescript
// Actualmente: Sin auditoría
// Solo logs básicos en auth.ts
logger.info('User logged in') // ❌ No estructurado, no persistente
```

#### ¿Es Viable?
**✅ SÍ - Alta Viabilidad**

**Razones**:
- Prisma ya configurado
- Modelo de datos relacional existente
- Next.js Server Actions ideales para auditoría
- Patrón decorator/wrapper aplicable

**Beneficios**:
- Compliance (GDPR, SOC2, ISO 27001)
- Trazabilidad completa
- Investigación de incidentes
- Reportes de actividad
- Detección de anomalías

**Arquitectura Propuesta**:
```typescript
// Modelo de auditoría
AuditLog {
  id, userId, action, module, entityType, entityId,
  changes, ipAddress, userAgent, metadata, timestamp
}

// Decorador automático
@Auditable("user:create")
async function createUser() { ... }
```

**Trade-offs**:
- Espacio en BD (mitigable con particionamiento)
- Pequeño overhead en writes (~2-3%)
- Requiere política de retención de datos

---

## 🗺️ Plan de Implementación

### FASE 1: Sistema de Logging Estandarizado (4-6 horas)

#### Objetivo
Mejorar el sistema de logging actual con contexto rico, correlación de requests y logs estructurados.

#### Paso 1.1: Diseñar Estructura de Logs

**Archivo**: `src/lib/logger/types.ts`

```typescript
// Contexto de log estructurado
export interface LogContext {
  // Request tracking
  requestId?: string;        // UUID único por request
  userId?: string;           // Usuario autenticado
  sessionId?: string;        // Session token

  // Location
  module: string;            // "auth", "users", "roles"
  action?: string;           // "login", "create", "update"

  // Performance
  duration?: number;         // Tiempo de ejecución (ms)

  // Metadata
  metadata?: Record<string, unknown>;

  // Error tracking
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// Niveles de log por módulo
export interface LogLevels {
  auth: 'debug' | 'info' | 'warn' | 'error';
  users: 'debug' | 'info' | 'warn' | 'error';
  api: 'debug' | 'info' | 'warn' | 'error';
  // ... extensible
}
```

#### Paso 1.2: Crear Logger Estructurado

**Archivo**: `src/lib/logger/structured-logger.ts`

```typescript
import pino from 'pino';
import { env } from '../env';
import type { LogContext } from './types';

class StructuredLogger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: env.LOG_LEVEL,
      formatters: {
        level: (label) => ({ level: label }),
      },
      // Serializers para objetos complejos
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    });
  }

  // Método principal
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext) {
    const logData = {
      msg: message,
      ...context,
      timestamp: new Date().toISOString(),
    };

    this.logger[level](logData);
  }

  // Helpers
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  error(message: string, error: Error, context?: Omit<LogContext, 'error'>) {
    this.log('error', message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  // Performance logging
  async measure<T>(
    fn: () => Promise<T>,
    context: LogContext
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info('Operation completed', { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error('Operation failed', error as Error, { ...context, duration });
      throw error;
    }
  }
}

export const structuredLogger = new StructuredLogger();
```

#### Paso 1.3: Middleware de Request ID

**Archivo**: `src/middleware/request-id.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

// AsyncLocalStorage para request context
import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
}>();

export function requestIdMiddleware(request: NextRequest) {
  const requestId = randomUUID();

  // Store en headers para propagación
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Devolver en response headers
  response.headers.set('x-request-id', requestId);

  return response;
}
```

#### Paso 1.4: Actualizar Proxy Middleware

**Archivo**: `src/proxy.ts` (actualizar)

Agregar el middleware de request ID al proxy existente.

#### Paso 1.5: Helper para Server Actions

**Archivo**: `src/lib/logger/helpers.ts`

```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { LogContext } from './types';

/**
 * Obtener contexto de log para server actions
 */
export async function getLogContext(
  module: string,
  action?: string
): Promise<Partial<LogContext>> {
  const session = await auth();
  const headersList = await headers();

  return {
    requestId: headersList.get('x-request-id') ?? undefined,
    userId: session?.user?.id,
    sessionId: session?.sessionToken,
    module,
    action,
  };
}
```

#### Paso 1.6: Ejemplo de Uso

```typescript
// src/actions/auth.ts (actualizado)
import { structuredLogger } from '@/lib/logger/structured-logger';
import { getLogContext } from '@/lib/logger/helpers';

export async function login(credentials: LoginInput) {
  const context = await getLogContext('auth', 'login');

  structuredLogger.info('Login attempt started', {
    ...context,
    metadata: { email: credentials.email },
  });

  try {
    // Medir performance
    const result = await structuredLogger.measure(
      async () => {
        // ... lógica de login
        return await signIn('credentials', credentials);
      },
      context
    );

    structuredLogger.info('Login successful', {
      ...context,
      metadata: { email: credentials.email },
    });

    return result;
  } catch (error) {
    structuredLogger.error('Login failed', error as Error, {
      ...context,
      metadata: { email: credentials.email },
    });
    throw error;
  }
}
```

#### Entregables Fase 1
- ✅ `src/lib/logger/types.ts` - Tipos de logging
- ✅ `src/lib/logger/structured-logger.ts` - Logger estructurado
- ✅ `src/lib/logger/helpers.ts` - Helpers para server actions
- ✅ `src/middleware/request-id.ts` - Request ID middleware
- ✅ Actualización de `src/proxy.ts`
- ✅ Ejemplo de uso en `src/actions/auth.ts`
- ✅ Tests unitarios para logger

---

### FASE 2: Sistema de Eventos (Event-Driven) (6-8 horas)

#### Objetivo
Implementar un sistema de eventos para desacoplar notificaciones y acciones reactivas.

#### Paso 2.1: Diseñar Catálogo de Eventos

**Archivo**: `src/lib/events/types.ts`

```typescript
// Catálogo de eventos del sistema
export enum SystemEvent {
  // Auth events
  USER_REGISTERED = 'user.registered',
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',
  PASSWORD_RESET_REQUESTED = 'password.reset_requested',
  PASSWORD_CHANGED = 'password.changed',

  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_ASSIGNED = 'user.role_assigned',
  USER_ROLE_REMOVED = 'user.role_removed',

  // Role events
  ROLE_CREATED = 'role.created',
  ROLE_UPDATED = 'role.updated',
  ROLE_DELETED = 'role.deleted',
  ROLE_PERMISSION_ASSIGNED = 'role.permission_assigned',

  // Permission events
  PERMISSION_CREATED = 'permission.created',

  // Session events
  SESSION_EXPIRED = 'session.expired',
  CONCURRENT_SESSION_DETECTED = 'session.concurrent_detected',
}

// Payload de eventos
export interface EventPayload {
  [SystemEvent.USER_REGISTERED]: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };

  [SystemEvent.USER_LOGGED_IN]: {
    userId: string;
    email: string;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
  };

  [SystemEvent.USER_LOGGED_OUT]: {
    userId: string;
    sessionId: string;
  };

  [SystemEvent.PASSWORD_RESET_REQUESTED]: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  };

  [SystemEvent.PASSWORD_CHANGED]: {
    userId: string;
    email: string;
    changedBy: 'self' | 'admin';
  };

  // ... resto de eventos
}

// Base para todos los eventos
export interface BaseEvent<T extends SystemEvent> {
  event: T;
  payload: EventPayload[T];
  metadata: {
    timestamp: Date;
    requestId?: string;
    userId?: string;
  };
}
```

#### Paso 2.2: Implementar Event Bus

**Archivo**: `src/lib/events/event-bus.ts`

```typescript
import { EventEmitter } from 'events';
import { structuredLogger } from '../logger/structured-logger';
import type { SystemEvent, BaseEvent, EventPayload } from './types';

type EventListener<T extends SystemEvent> = (
  event: BaseEvent<T>
) => Promise<void> | void;

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(50); // Permitir múltiples listeners
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emitir evento
   */
  async dispatch<T extends SystemEvent>(
    event: T,
    payload: EventPayload[T],
    metadata?: {
      requestId?: string;
      userId?: string;
    }
  ): Promise<void> {
    const eventData: BaseEvent<T> = {
      event,
      payload,
      metadata: {
        timestamp: new Date(),
        ...metadata,
      },
    };

    structuredLogger.info('Event dispatched', {
      module: 'events',
      action: 'dispatch',
      metadata: {
        event,
        ...metadata,
      },
    });

    // Emitir de forma asíncrona
    this.emit(event, eventData);

    // Emitir también evento genérico para logging global
    this.emit('*', eventData);
  }

  /**
   * Registrar listener para evento específico
   */
  subscribe<T extends SystemEvent>(
    event: T,
    listener: EventListener<T>
  ): void {
    this.on(event, async (eventData: BaseEvent<T>) => {
      try {
        await listener(eventData);
      } catch (error) {
        structuredLogger.error('Event listener failed', error as Error, {
          module: 'events',
          action: 'listener_error',
          metadata: {
            event,
            error: (error as Error).message,
          },
        });
      }
    });

    structuredLogger.info('Event listener registered', {
      module: 'events',
      action: 'subscribe',
      metadata: { event },
    });
  }

  /**
   * Registrar listener para todos los eventos
   */
  subscribeAll(listener: EventListener<SystemEvent>): void {
    this.on('*', listener);
  }
}

export const eventBus = EventBus.getInstance();
```

#### Paso 2.3: Crear Email Listener

**Archivo**: `src/lib/events/listeners/email-listener.ts`

```typescript
import { eventBus } from '../event-bus';
import { SystemEvent } from '../types';
import { activeEmailService } from '@/lib/email/email-service';
import { structuredLogger } from '@/lib/logger/structured-logger';
import Mustache from 'mustache';
import fs from 'fs/promises';
import path from 'path';

/**
 * Listener para enviar emails basados en eventos
 */
export class EmailEventListener {
  private templatesPath = path.join(process.cwd(), 'src/lib/email/templates');

  register() {
    // Login notification
    eventBus.subscribe(SystemEvent.USER_LOGGED_IN, async (event) => {
      await this.sendLoginNotification(event.payload);
    });

    // Password reset
    eventBus.subscribe(SystemEvent.PASSWORD_RESET_REQUESTED, async (event) => {
      await this.sendPasswordResetEmail(event.payload);
    });

    // Password changed notification
    eventBus.subscribe(SystemEvent.PASSWORD_CHANGED, async (event) => {
      await this.sendPasswordChangedNotification(event.payload);
    });

    // Welcome email
    eventBus.subscribe(SystemEvent.USER_REGISTERED, async (event) => {
      await this.sendWelcomeEmail(event.payload);
    });

    structuredLogger.info('Email event listeners registered', {
      module: 'events',
      action: 'register_listeners',
    });
  }

  private async sendLoginNotification(payload: {
    email: string;
    ipAddress: string;
    userAgent: string;
  }) {
    try {
      const template = await fs.readFile(
        path.join(this.templatesPath, 'login-notification.mustache'),
        'utf8'
      );

      const html = Mustache.render(template, {
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        timestamp: new Date().toLocaleString('es-ES'),
        appName: process.env.APP_NAME,
      });

      await activeEmailService.send({
        to: payload.email,
        subject: 'Nuevo inicio de sesión detectado',
        html,
      });

      structuredLogger.info('Login notification sent', {
        module: 'events',
        action: 'email_sent',
        metadata: { email: payload.email },
      });
    } catch (error) {
      structuredLogger.error('Failed to send login notification', error as Error, {
        module: 'events',
        action: 'email_failed',
      });
    }
  }

  private async sendPasswordResetEmail(payload: {
    email: string;
    token: string;
  }) {
    // Similar al actual, pero usando eventos
    // ... implementación
  }

  private async sendPasswordChangedNotification(payload: {
    email: string;
    changedBy: 'self' | 'admin';
  }) {
    // Nuevo email de notificación
    // ... implementación
  }

  private async sendWelcomeEmail(payload: {
    email: string;
    firstName: string | null;
  }) {
    // Email de bienvenida
    // ... implementación
  }
}
```

#### Paso 2.4: Inicializar Listeners

**Archivo**: `src/lib/events/index.ts`

```typescript
import { EmailEventListener } from './listeners/email-listener';
import { AuditEventListener } from './listeners/audit-listener'; // Fase 3
import { structuredLogger } from '../logger/structured-logger';

/**
 * Inicializar todos los event listeners
 * Llamar en app startup
 */
export function initializeEventListeners() {
  structuredLogger.info('Initializing event listeners', {
    module: 'events',
    action: 'init',
  });

  // Email listener
  const emailListener = new EmailEventListener();
  emailListener.register();

  // Audit listener (Fase 3)
  // const auditListener = new AuditEventListener();
  // auditListener.register();

  structuredLogger.info('Event listeners initialized', {
    module: 'events',
    action: 'init_complete',
  });
}

// Re-export event bus
export { eventBus } from './event-bus';
export { SystemEvent } from './types';
```

#### Paso 2.5: Integrar en App

**Archivo**: `src/app/layout.tsx` (actualizar)

```typescript
import { initializeEventListeners } from '@/lib/events';

// Inicializar listeners en app startup
if (process.env.NODE_ENV !== 'test') {
  initializeEventListeners();
}

export default async function RootLayout({ children }) {
  // ... resto del layout
}
```

#### Paso 2.6: Actualizar Server Actions

**Archivo**: `src/actions/auth.ts` (ejemplo)

```typescript
import { eventBus, SystemEvent } from '@/lib/events';

export async function login(credentials: LoginInput) {
  // ... lógica de login

  // Emitir evento en lugar de enviar email directamente
  await eventBus.dispatch(
    SystemEvent.USER_LOGGED_IN,
    {
      userId: user.id,
      email: user.email,
      sessionId: sessionToken,
      ipAddress,
      userAgent,
    },
    {
      requestId: context.requestId,
      userId: user.id,
    }
  );

  return successResponse({ redirectUrl: '/dashboard' });
}
```

#### Paso 2.7: Crear Templates de Email

**Archivos**:
- `src/lib/email/templates/login-notification.mustache`
- `src/lib/email/templates/password-changed.mustache`
- `src/lib/email/templates/welcome.mustache`

#### Entregables Fase 2
- ✅ `src/lib/events/types.ts` - Tipos de eventos
- ✅ `src/lib/events/event-bus.ts` - Event bus
- ✅ `src/lib/events/listeners/email-listener.ts` - Email listener
- ✅ `src/lib/events/index.ts` - Inicialización
- ✅ Templates de email (login, password changed, welcome)
- ✅ Actualización de server actions
- ✅ Tests de eventos

---

### FASE 3: Sistema de Auditoría (8-10 horas)

#### Objetivo
Implementar registro completo de acciones de usuarios para trazabilidad.

#### Paso 3.1: Diseñar Modelo de Auditoría

**Archivo**: `prisma/schema.prisma` (agregar)

```prisma
// ============================================================================
// AUDIT SYSTEM - Activity logging and traceability
// ============================================================================

model AuditLog {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid

  // Who
  userId    String?  @map("user_id") @db.Uuid
  user      User?    @relation("AuditLogs", fields: [userId], references: [id], onDelete: SetNull)

  // What
  action    String   @db.VarChar(100)  // "create", "update", "delete", "login"
  module    String   @db.VarChar(50)   // "users", "roles", "auth"

  // Where
  entityType String? @map("entity_type") @db.VarChar(50)  // "User", "Role"
  entityId   String? @map("entity_id") @db.VarChar(255)   // UUID del registro afectado

  // Changes (JSON)
  oldValues  Json?   @map("old_values")  // Estado anterior
  newValues  Json?   @map("new_values")  // Estado nuevo

  // Context
  ipAddress  String? @map("ip_address") @db.VarChar(45)
  userAgent  String? @map("user_agent") @db.Text
  requestId  String? @map("request_id") @db.Uuid

  // Additional metadata
  metadata   Json?

  // When
  timestamp  DateTime @default(now())

  @@map("audit_log")
  @@index([userId], map: "idx_audit_log_user_id")
  @@index([action], map: "idx_audit_log_action")
  @@index([module], map: "idx_audit_log_module")
  @@index([entityType, entityId], map: "idx_audit_log_entity")
  @@index([timestamp], map: "idx_audit_log_timestamp")
  @@index([requestId], map: "idx_audit_log_request_id")
}
```

**Actualizar User model**:
```prisma
model User {
  // ... campos existentes

  // Relations
  auditLogs AuditLog[] @relation("AuditLogs")

  // ... resto de relaciones
}
```

#### Paso 3.2: Generar Migración

```bash
cd application-base
npx prisma migrate dev --name add_audit_system
```

#### Paso 3.3: Crear Servicio de Auditoría

**Archivo**: `src/lib/audit/audit-service.ts`

```typescript
import { prisma } from '@/lib/prisma/connection';
import { structuredLogger } from '@/lib/logger/structured-logger';
import type { Prisma } from '@prisma/client';

export interface AuditLogInput {
  userId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Crear registro de auditoría
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          module: input.module,
          entityType: input.entityType,
          entityId: input.entityId,
          oldValues: input.oldValues as Prisma.InputJsonValue,
          newValues: input.newValues as Prisma.InputJsonValue,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          requestId: input.requestId,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      });

      structuredLogger.info('Audit log created', {
        module: 'audit',
        action: 'log',
        metadata: {
          auditAction: input.action,
          auditModule: input.module,
        },
      });
    } catch (error) {
      structuredLogger.error('Failed to create audit log', error as Error, {
        module: 'audit',
        action: 'log_failed',
      });
    }
  }

  /**
   * Obtener logs de auditoría con filtros
   */
  async getLogs(filters: {
    userId?: string;
    module?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.module) where.module = filters.module;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    });
  }

  /**
   * Calcular diff entre old y new values
   */
  private calculateDiff(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Record<string, { old: unknown; new: unknown }> {
    const diff: Record<string, { old: unknown; new: unknown }> = {};

    // Campos modificados
    for (const key in newValues) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        diff[key] = {
          old: oldValues[key],
          new: newValues[key],
        };
      }
    }

    return diff;
  }
}

export const auditService = new AuditService();
```

#### Paso 3.4: Crear Audit Event Listener

**Archivo**: `src/lib/events/listeners/audit-listener.ts`

```typescript
import { eventBus } from '../event-bus';
import { SystemEvent } from '../types';
import { auditService } from '@/lib/audit/audit-service';

/**
 * Listener para registrar auditoría basado en eventos
 */
export class AuditEventListener {
  register() {
    // Login
    eventBus.subscribe(SystemEvent.USER_LOGGED_IN, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'login',
        module: 'auth',
        ipAddress: event.payload.ipAddress,
        userAgent: event.payload.userAgent,
        requestId: event.metadata.requestId,
        metadata: {
          sessionId: event.payload.sessionId,
        },
      });
    });

    // Logout
    eventBus.subscribe(SystemEvent.USER_LOGGED_OUT, async (event) => {
      await auditService.log({
        userId: event.payload.userId,
        action: 'logout',
        module: 'auth',
        requestId: event.metadata.requestId,
      });
    });

    // User created
    eventBus.subscribe(SystemEvent.USER_CREATED, async (event) => {
      await auditService.log({
        userId: event.metadata.userId, // Admin que creó
        action: 'create',
        module: 'users',
        entityType: 'User',
        entityId: event.payload.userId,
        newValues: {
          email: event.payload.email,
          name: event.payload.name,
        },
        requestId: event.metadata.requestId,
      });
    });

    // User updated
    eventBus.subscribe(SystemEvent.USER_UPDATED, async (event) => {
      await auditService.log({
        userId: event.metadata.userId,
        action: 'update',
        module: 'users',
        entityType: 'User',
        entityId: event.payload.userId,
        oldValues: event.payload.oldValues,
        newValues: event.payload.newValues,
        requestId: event.metadata.requestId,
      });
    });

    // ... más eventos
  }
}
```

#### Paso 3.5: Decorador para Auditoría Automática

**Archivo**: `src/lib/audit/decorators.ts`

```typescript
import { auditService } from './audit-service';
import { getLogContext } from '../logger/helpers';

/**
 * Decorador para auditar automáticamente funciones
 */
export function Auditable(
  action: string,
  module: string,
  options?: {
    entityType?: string;
    extractEntityId?: (args: unknown[]) => string;
    extractOldValues?: (args: unknown[]) => Promise<Record<string, unknown>>;
    extractNewValues?: (result: unknown) => Record<string, unknown>;
  }
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const context = await getLogContext(module, action);

      let oldValues: Record<string, unknown> | undefined;
      if (options?.extractOldValues) {
        oldValues = await options.extractOldValues(args);
      }

      // Ejecutar método original
      const result = await originalMethod.apply(this, args);

      let newValues: Record<string, unknown> | undefined;
      if (options?.extractNewValues) {
        newValues = options.extractNewValues(result);
      }

      // Registrar auditoría
      await auditService.log({
        userId: context.userId,
        action,
        module,
        entityType: options?.entityType,
        entityId: options?.extractEntityId?.(args),
        oldValues,
        newValues,
        requestId: context.requestId,
      });

      return result;
    };

    return descriptor;
  };
}
```

#### Paso 3.6: Helper para Auditoría Manual

**Archivo**: `src/lib/audit/helpers.ts`

```typescript
import { auditService } from './audit-service';
import { getLogContext } from '../logger/helpers';
import { headers } from 'next/headers';

/**
 * Helper para auditar operaciones CRUD manualmente
 */
export async function auditOperation(
  action: 'create' | 'update' | 'delete',
  module: string,
  entityType: string,
  entityId: string,
  options?: {
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  const context = await getLogContext(module, action);
  const headersList = await headers();

  await auditService.log({
    userId: context.userId,
    action,
    module,
    entityType,
    entityId,
    oldValues: options?.oldValues,
    newValues: options?.newValues,
    ipAddress: headersList.get('x-forwarded-for') ?? undefined,
    userAgent: headersList.get('user-agent') ?? undefined,
    requestId: context.requestId,
    metadata: options?.metadata,
  });
}
```

#### Paso 3.7: Ejemplo de Uso

**Opción 1: Con decorador**

```typescript
// src/actions/users.ts
import { Auditable } from '@/lib/audit/decorators';

class UserActions {
  @Auditable('create', 'users', {
    entityType: 'User',
    extractEntityId: (args) => (args[0] as { userId: string }).userId,
    extractNewValues: (result) => ({
      email: (result as { email: string }).email,
      name: (result as { name: string }).name,
    }),
  })
  async createUser(data: CreateUserInput) {
    // ... lógica
    return user;
  }
}
```

**Opción 2: Manual (más flexible para Next.js Server Actions)**

```typescript
// src/actions/users.ts
import { auditOperation } from '@/lib/audit/helpers';
import { eventBus, SystemEvent } from '@/lib/events';

export async function updateUser(
  userId: string,
  data: UpdateUserInput
): Promise<ActionResponse<User>> {
  // Obtener valores anteriores
  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!oldUser) {
    return errorResponse('Usuario no encontrado');
  }

  // Actualizar
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
  });

  // Auditar directamente
  await auditOperation('update', 'users', 'User', userId, {
    oldValues: {
      email: oldUser.email,
      firstName: oldUser.firstName,
      lastName: oldUser.lastName,
    },
    newValues: {
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
    },
  });

  // O emitir evento (que auditará automáticamente)
  await eventBus.dispatch(SystemEvent.USER_UPDATED, {
    userId: updatedUser.id,
    oldValues: { /* ... */ },
    newValues: { /* ... */ },
  });

  return successResponse(updatedUser);
}
```

#### Paso 3.8: API Routes para Auditoría

**Archivo**: `src/app/api/audit/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { auditService } from '@/lib/audit/audit-service';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Solo admin puede ver auditoría
  const canViewAudit = await hasPermission(session.user.id, 'audit:view');
  if (!canViewAudit) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;

  const logs = await auditService.getLogs({
    userId: searchParams.get('userId') ?? undefined,
    module: searchParams.get('module') ?? undefined,
    action: searchParams.get('action') ?? undefined,
    entityType: searchParams.get('entityType') ?? undefined,
    entityId: searchParams.get('entityId') ?? undefined,
    startDate: searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined,
    endDate: searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined,
    limit: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50,
    offset: searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0,
  });

  return Response.json({ data: logs });
}
```

#### Paso 3.9: Página de Auditoría

**Archivo**: `src/app/(protected)/audit/page.tsx`

```typescript
import { AuditLogTable } from '@/components/audit/audit-log-table';
import { AuditFilters } from '@/components/audit/audit-filters';

export default async function AuditPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Auditoría del Sistema</h1>

      <AuditFilters />

      <div className="mt-6">
        <AuditLogTable />
      </div>
    </div>
  );
}
```

#### Entregables Fase 3
- ✅ Modelo `AuditLog` en Prisma
- ✅ Migración de BD
- ✅ `src/lib/audit/audit-service.ts` - Servicio principal
- ✅ `src/lib/audit/decorators.ts` - Decoradores
- ✅ `src/lib/audit/helpers.ts` - Helpers
- ✅ `src/lib/events/listeners/audit-listener.ts` - Listener
- ✅ `src/app/api/audit/route.ts` - API endpoint
- ✅ `src/app/(protected)/audit/page.tsx` - Página UI
- ✅ Componentes de tabla y filtros
- ✅ Tests de auditoría

---

### FASE 4: Integración y Testing (4-6 horas)

#### Paso 4.1: Tests Unitarios - Logger

```typescript
// src/lib/logger/__tests__/structured-logger.test.ts
describe('StructuredLogger', () => {
  it('should log with context', () => { /* ... */ });
  it('should measure performance', () => { /* ... */ });
  it('should handle errors properly', () => { /* ... */ });
});
```

#### Paso 4.2: Tests Unitarios - Event Bus

```typescript
// src/lib/events/__tests__/event-bus.test.ts
describe('EventBus', () => {
  it('should dispatch events', () => { /* ... */ });
  it('should handle multiple listeners', () => { /* ... */ });
  it('should handle listener errors', () => { /* ... */ });
});
```

#### Paso 4.3: Tests Unitarios - Audit Service

```typescript
// src/lib/audit/__tests__/audit-service.test.ts
describe('AuditService', () => {
  it('should create audit log', () => { /* ... */ });
  it('should retrieve logs with filters', () => { /* ... */ });
  it('should calculate diff correctly', () => { /* ... */ });
});
```

#### Paso 4.4: Tests de Integración

```typescript
// src/__tests__/integration/audit-flow.test.ts
describe('Audit Flow', () => {
  it('should audit user creation end-to-end', async () => {
    // 1. Create user
    const user = await createUser({ /* ... */ });

    // 2. Verify event dispatched
    expect(eventBus.emit).toHaveBeenCalledWith(
      SystemEvent.USER_CREATED,
      expect.any(Object)
    );

    // 3. Verify audit log created
    const logs = await auditService.getLogs({
      entityId: user.id,
      action: 'create',
    });
    expect(logs).toHaveLength(1);
  });
});
```

#### Paso 4.5: Actualizar Todos los Server Actions

- ✅ `src/actions/auth.ts`
- ✅ `src/actions/users.ts`
- ✅ `src/actions/roles.ts`
- ✅ `src/actions/permissions.ts`

#### Paso 4.6: Documentación

**Archivo**: `docs/LOGGING.md`
**Archivo**: `docs/EVENTS.md`
**Archivo**: `docs/AUDIT.md`

#### Paso 4.7: Actualizar Development Guide

```markdown
## Logging

All server actions should use structured logging:
\`\`\`typescript
import { structuredLogger } from '@/lib/logger/structured-logger';
import { getLogContext } from '@/lib/logger/helpers';

export async function myAction() {
  const context = await getLogContext('module', 'action');
  structuredLogger.info('Operation started', context);
  // ...
}
\`\`\`

## Events

Dispatch events for important actions:
\`\`\`typescript
await eventBus.dispatch(SystemEvent.USER_CREATED, { userId });
\`\`\`

## Audit

Use helper for manual audit:
\`\`\`typescript
await auditOperation('create', 'users', 'User', userId, {
  newValues: { email, name },
});
\`\`\`
```

#### Entregables Fase 4
- ✅ Suite completa de tests
- ✅ Actualización de todos los server actions
- ✅ Documentación técnica
- ✅ Actualización de development guide
- ✅ Ejemplos de uso

---

## 📊 Checklist de Implementación

### Pre-implementación
- [ ] Revisar plan completo
- [ ] Crear rama `feature/logging-events-audit`
- [ ] Backup de BD (opcional)
- [ ] Instalar dependencias necesarias

### Fase 1: Logging
- [ ] Crear tipos de logging
- [ ] Implementar structured logger
- [ ] Crear middleware de request ID
- [ ] Actualizar proxy middleware
- [ ] Crear helpers
- [ ] Ejemplo en auth.ts
- [ ] Tests unitarios
- [ ] Validar logs en desarrollo

### Fase 2: Eventos
- [ ] Crear catálogo de eventos
- [ ] Implementar event bus
- [ ] Crear email listener
- [ ] Crear templates de email
- [ ] Inicializar listeners en app
- [ ] Actualizar server actions
- [ ] Tests de eventos
- [ ] Validar envío de emails

### Fase 3: Auditoría
- [ ] Diseñar modelo Prisma
- [ ] Generar migración
- [ ] Ejecutar migración en dev
- [ ] Crear audit service
- [ ] Crear audit listener
- [ ] Crear helpers y decoradores
- [ ] Crear API routes
- [ ] Crear página UI
- [ ] Tests de auditoría
- [ ] Validar registro de auditoría

### Fase 4: Integración
- [ ] Tests unitarios completos
- [ ] Tests de integración
- [ ] Actualizar todos los actions
- [ ] Documentación técnica
- [ ] Actualizar development guide
- [ ] Code review
- [ ] Merge a main

---

## 🚨 Consideraciones Importantes

### Performance

**Logging**:
- Overhead: ~1-2% en throughput
- Mitigación: Usar `LOG_LEVEL=info` en producción

**Eventos**:
- Overhead: ~2-3% por evento (asíncrono)
- Mitigación: Listeners no bloquean operación principal

**Auditoría**:
- Overhead: ~2-3% en writes
- Mitigación:
  - Índices apropiados en BD
  - Particionamiento por fecha (futuro)
  - Archivado automático (futuro)

### Escalabilidad

**Eventos (Futuro)**:
- Actualmente: EventEmitter in-memory
- Migración futura: Redis Pub/Sub o message queue (RabbitMQ, SQS)
- Compatible: API es la misma, solo cambiar implementación

**Auditoría**:
- Particionamiento: Por mes/año
- Archivado: S3/objeto storage después de 1 año
- Retención: Según política de empresa

### Seguridad

**Auditoría**:
- No registrar passwords (nunca)
- Sanitizar datos sensibles (tarjetas, SSN)
- Encriptar campos sensibles si es necesario
- Control de acceso estricto (solo admin)

**Logging**:
- No loggear tokens ni secrets
- Sanitizar PII en logs
- Rotar logs regularmente

---

## 📈 Métricas de Éxito

### Logging
- ✅ 100% de server actions con logging estructurado
- ✅ Request ID en todos los logs
- ✅ Correlación de requests completa
- ✅ Performance < 2% overhead

### Eventos
- ✅ Todos los eventos críticos emitidos
- ✅ Emails enviados correctamente
- ✅ No hay blocking en operaciones principales
- ✅ Listeners manejan errores apropiadamente

### Auditoría
- ✅ 100% de operaciones CRUD auditadas
- ✅ Trazabilidad completa de cambios
- ✅ UI funcional para consulta
- ✅ Performance de queries < 500ms

---

## 🔄 Roadmap Futuro

### Corto Plazo (1-2 meses)
- [ ] Dashboards de auditoría
- [ ] Exportación de logs (CSV, JSON)
- [ ] Alertas por email (eventos críticos)

### Medio Plazo (3-6 meses)
- [ ] Integración con APM (Datadog, New Relic)
- [ ] Migrar eventos a Redis Pub/Sub
- [ ] Implementar message queue (RabbitMQ)
- [ ] Particionamiento automático de auditoría

### Largo Plazo (6-12 meses)
- [ ] Machine learning sobre auditoría (detección anomalías)
- [ ] Webhooks para eventos
- [ ] Compliance automático (GDPR, SOC2)
- [ ] Distributed tracing (OpenTelemetry)

---

## 📝 Conclusión

Este plan transforma Aurora Nova en una aplicación base de nivel empresarial con:

✅ **Logging profesional**: Debugging y monitoreo efectivos
✅ **Arquitectura desacoplada**: Extensible sin modificar código
✅ **Trazabilidad completa**: Auditoría para compliance
✅ **Escalable**: Preparado para crecimiento
✅ **Mantenible**: Código limpio y bien documentado

**Inversión**: ~3-4 días de desarrollo
**Retorno**: Base sólida para decenas de aplicaciones futuras

---

**Última Actualización**: 2025-11-30
**Autor**: Claude Code (AI Assistant)
**Estado**: Pendiente de aprobación
