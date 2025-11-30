# Guía de Logging Estandarizado
# Aurora Nova - Sistema de Logging Estructurado

**Última Actualización**: 2025-11-30
**Versión**: 1.0.0

---

## 📋 Tabla de Contenidos

1. [Resumen](#resumen)
2. [Uso Básico](#uso-básico)
3. [Server Actions](#server-actions)
4. [API Routes](#api-routes)
5. [Logs Estandarizados](#logs-estandarizados)
6. [Mejores Prácticas](#mejores-prácticas)

---

## Resumen

Aurora Nova usa un sistema de logging estructurado basado en **Pino** con contexto rico, request tracking y sanitización automática de datos sensibles.

### ✅ Beneficios

- **Logs estructurados**: JSON format, fácil de parsear y buscar
- **Request correlation**: Cada request tiene un ID único
- **Performance tracking**: Medición automática de duración
- **Sanitización**: Passwords y tokens se redactan automáticamente
- **Contexto rico**: Usuario, módulo, acción, metadata

---

## Uso Básico

### Importar el Logger

```typescript
import { structuredLogger } from '@/lib/logger/structured-logger';
import { getLogContext, createLogContext, enrichContext } from '@/lib/logger/helpers';
```

### Niveles de Log

```typescript
// Debug: información detallada para debugging
structuredLogger.debug('Debug message', context);

// Info: operaciones normales
structuredLogger.info('User created successfully', context);

// Warning: situaciones anormales pero no críticas
structuredLogger.warn('Invalid input received', context);

// Error: errores que requieren atención
structuredLogger.error('Database connection failed', error, context);

// Fatal: errores críticos que detienen la aplicación
structuredLogger.fatal('Application crashed', error, context);
```

---

## Server Actions

### Ejemplo Básico

```typescript
'use server'

import { structuredLogger } from '@/lib/logger/structured-logger';
import { getLogContext, enrichContext } from '@/lib/logger/helpers';

export async function createUser(data: CreateUserInput) {
  // 1. Obtener contexto del request
  const context = await getLogContext('users', 'create');

  // 2. Log inicio de operación
  structuredLogger.info('Creating user',
    enrichContext(context, { email: data.email })
  );

  try {
    // 3. Ejecutar operación con medición de performance
    const user = await structuredLogger.measure(
      async () => {
        return await prisma.user.create({ data });
      },
      enrichContext(context, { email: data.email })
    );

    // 4. Log éxito (automático con measure, pero puedes agregar más info)
    structuredLogger.info('User created successfully',
      enrichContext(context, {
        userId: user.id,
        email: user.email,
      })
    );

    return successResponse(user);
  } catch (error) {
    // 5. Log error
    structuredLogger.error('Failed to create user', error as Error,
      enrichContext(context, { email: data.email })
    );

    return errorResponse('Error creating user');
  }
}
```

### Ejemplo con Validación

```typescript
export async function updateUser(userId: string, data: UpdateUserInput) {
  const context = await getLogContext('users', 'update');

  // Validar datos
  const validated = schema.safeParse(data);
  if (!validated.success) {
    structuredLogger.warn('Validation failed',
      enrichContext(context, {
        userId,
        errors: validated.error.errors,
      })
    );
    return errorResponse('Validation failed', validated.error);
  }

  // ... resto de la lógica
}
```

---

## API Routes

### Usando handleApiError

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, logApiSuccess } from '@/lib/api/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany();

    // Log éxito
    await logApiSuccess('Users fetched', 'users', 'list', {
      count: users.length,
    }, request);

    return NextResponse.json({ data: users });
  } catch (error) {
    // Manejo automático de errores con logging
    return await handleApiError(error, 'users', 'list', request);
  }
}
```

### Usando withApiHandler (Wrapper)

```typescript
import { withApiHandler } from '@/lib/api/api-helpers';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const users = await prisma.user.findMany();

    await logApiSuccess('Users fetched', 'users', 'list', {
      count: users.length,
    }, request);

    return NextResponse.json({ data: users });
  },
  'users',
  'list'
);
```

### API Route con Parámetros

```typescript
import { withApiHandler } from '@/lib/api/api-helpers';

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await logApiSuccess('User fetched', 'users', 'get', { userId: id }, request);

    return NextResponse.json({ data: user });
  },
  'users',
  'get'
);
```

---

## Logs Estandarizados

### Estructura de Log

Todos los logs estructurados incluyen:

```json
{
  "level": "info",
  "timestamp": "2025-11-30T19:00:00.000Z",
  "msg": "User created successfully",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-id-123",
  "sessionId": "session-token-456",
  "module": "users",
  "action": "create",
  "duration": 45,
  "metadata": {
    "email": "user@example.com",
    "userId": "new-user-id"
  }
}
```

### Sanitización Automática

Los siguientes campos se redactan automáticamente:

- `password`
- `token`
- `secret`
- `apiKey`
- `accessToken`
- `refreshToken`
- `sessionToken`
- `hashedPassword`

```typescript
// Entrada
structuredLogger.info('Login attempt', {
  module: 'auth',
  metadata: {
    email: 'user@example.com',
    password: 'secret123',  // ⚠️ Será redactado
  },
});

// Salida en logs
{
  "msg": "Login attempt",
  "module": "auth",
  "metadata": {
    "email": "user@example.com",
    "password": "[REDACTED]"  // ✅ Sanitizado
  }
}
```

---

## Mejores Prácticas

### ✅ DO - Hacer

1. **Usar contexto siempre**
   ```typescript
   const context = await getLogContext('module', 'action');
   structuredLogger.info('Message', context);
   ```

2. **Loggear eventos importantes**
   - Inicio de sesión / cierre de sesión
   - Creación/actualización/eliminación de recursos
   - Errores de validación
   - Fallos de autenticación/autorización

3. **Usar measure() para operaciones costosas**
   ```typescript
   await structuredLogger.measure(
     async () => expensiveOperation(),
     context
   );
   ```

4. **Enriquecer contexto con metadata relevante**
   ```typescript
   enrichContext(context, {
     userId: user.id,
     role: user.role,
   })
   ```

5. **Loggear tanto éxitos como errores**
   ```typescript
   structuredLogger.info('Operation succeeded', context);
   structuredLogger.error('Operation failed', error, context);
   ```

### ❌ DON'T - No Hacer

1. **No usar console.log directamente**
   ```typescript
   // ❌ Mal
   console.log('User created:', userId);

   // ✅ Bien
   structuredLogger.info('User created', createLogContext('users', 'create', { userId }));
   ```

2. **No loggear información sensible**
   ```typescript
   // ❌ Mal
   structuredLogger.info('Login', { password: userPassword });

   // ✅ Bien - el logger sanitiza automáticamente, pero mejor no incluirlo
   structuredLogger.info('Login', { email: userEmail });
   ```

3. **No loggear en exceso**
   ```typescript
   // ❌ Mal - demasiado verbose
   structuredLogger.debug('Entering function');
   structuredLogger.debug('Before database query');
   structuredLogger.debug('After database query');

   // ✅ Bien - solo lo importante
   structuredLogger.info('Processing user request', context);
   ```

4. **No olvidar el contexto**
   ```typescript
   // ❌ Mal - sin contexto
   structuredLogger.info('Something happened');

   // ✅ Bien - con contexto
   structuredLogger.info('Something happened', context);
   ```

---

## Migración de Logs Existentes

### Console.log → Structured Logger

```typescript
// ❌ Antes
console.log('User created:', user.id);

// ✅ Después
structuredLogger.info('User created',
  createLogContext('users', 'create', { userId: user.id })
);
```

### Console.error → Structured Logger

```typescript
// ❌ Antes
try {
  // ...
} catch (error) {
  console.error('Error creating user:', error);
}

// ✅ Después
try {
  // ...
} catch (error) {
  structuredLogger.error('Failed to create user', error as Error,
    createLogContext('users', 'create', { email: data.email })
  );
}
```

### API Routes → handleApiError

```typescript
// ❌ Antes
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ✅ Después
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const data = await fetchData();

    await logApiSuccess('Data fetched', 'module', 'fetch', {
      count: data.length,
    }, request);

    return NextResponse.json({ data });
  },
  'module',
  'fetch'
);
```

---

## Request ID Tracking

Cada request automáticamente recibe un `x-request-id` único que se propaga por todos los logs.

### Acceder al Request ID

```typescript
import { headers } from 'next/headers';
import { REQUEST_ID_HEADER } from '@/lib/logger/request-id';

export async function myAction() {
  const headersList = await headers();
  const requestId = headersList.get(REQUEST_ID_HEADER);

  // requestId está automáticamente en el contexto
  const context = await getLogContext('module', 'action');
  // context.requestId === requestId
}
```

### Buscar Logs por Request ID

```bash
# Buscar todos los logs de un request específico
cat logs.json | grep "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# O con jq
cat logs.json | jq 'select(.requestId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")'
```

---

## Ejemplos Completos

### Server Action Completo

```typescript
'use server'

import { structuredLogger } from '@/lib/logger/structured-logger';
import { getLogContext, enrichContext } from '@/lib/logger/helpers';
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export async function createUser(data: unknown) {
  const context = await getLogContext('users', 'create');

  structuredLogger.info('Create user request received', context);

  // Validación
  const validated = userSchema.safeParse(data);
  if (!validated.success) {
    structuredLogger.warn('Validation failed',
      enrichContext(context, {
        errors: validated.error.errors,
      })
    );
    return { success: false, error: 'Invalid data' };
  }

  // Operación con medición
  try {
    const user = await structuredLogger.measure(
      async () => {
        return await prisma.user.create({
          data: validated.data,
        });
      },
      enrichContext(context, { email: validated.data.email })
    );

    structuredLogger.info('User created successfully',
      enrichContext(context, {
        userId: user.id,
        email: user.email,
      })
    );

    return { success: true, data: user };
  } catch (error) {
    structuredLogger.error('Failed to create user', error as Error,
      enrichContext(context, { email: validated.data.email })
    );

    return { success: false, error: 'Database error' };
  }
}
```

### API Route Completo

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, logApiSuccess } from '@/lib/api/api-helpers';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await request.json();

    // Validación (ZodError se maneja automáticamente por handleApiError)
    const data = createUserSchema.parse(body);

    // Crear usuario
    const user = await prisma.user.create({ data });

    // Log éxito
    await logApiSuccess('User created', 'users', 'create', {
      userId: user.id,
      email: user.email,
    }, request);

    return NextResponse.json({ data: user }, { status: 201 });
  },
  'users',
  'create'
);
```

---

## Soporte y Referencias

- **Documentación de Pino**: https://getpino.io/
- **Código fuente**: `src/lib/logger/`
- **Tests**: `src/__tests__/unit/structured-logger.test.ts`
- **Helpers de API**: `src/lib/api/api-helpers.ts`

---

**Autor**: Aurora Nova Team
**Última Actualización**: 2025-11-30
