# Aurora Nova - Documentación Técnica v1.0 (Estable)

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
**Estado**: Primera versión estable de producción

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Características Principales](#características-principales)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Arquitectura](#arquitectura)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Módulos Principales](#módulos-principales)
7. [Configuración](#configuración)
8. [Primeros Pasos](#primeros-pasos)
9. [Desarrollo](#desarrollo)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Solución de Problemas](#solución-de-problemas)

---

## Descripción General

**Aurora Nova** es una aplicación web empresarial moderna construida con **Next.js 16** que proporciona un sistema completo de administración con autenticación segura, control de acceso basado en roles (RBAC), auditoría completa y observabilidad.

La aplicación está diseñada para ser:
- **Segura**: Autenticación híbrida JWT + Sesiones BD, validación de permisos en servidor
- **Observable**: Logging estructurado, rastreo de requests, auditoría automática
- **Escalable**: Arquitectura modular, fácil extensión de funcionalidades
- **Confiable**: Testing completo, manejo de errores uniforme, validación de datos
- **Productiva**: Herramientas modernas, desarrollo rápido, buena documentación

---

## Características Principales

### 1. Sistema de Autenticación Híbrido
- Autenticación con email y contraseña
- Tokens JWT para requests sin estado
- Sesiones en BD para rastreo multi-dispositivo
- Reset de contraseña seguro con tokens temporizados
- Logout remoto y cierre de todas las sesiones

**Configuración**: Auth.js v5 con CredentialsProvider
**Base de datos**: Tablas User, UserCredentials, Session, PasswordResetToken

### 2. Control de Acceso Basado en Roles (RBAC)

Implementa un sistema granular de permisos:
- **Usuarios**: Entidad principal con email, nombre y credenciales
- **Roles**: Grupos de permisos (SuperAdmin, Admin, User)
- **Permisos**: Acciones específicas (user:create, user:delete, etc.)
- **Relaciones Many-to-Many**: Usuarios ↔ Roles ↔ Permisos

El acceso se valida en:
- Rutas (ProtectedRoute component)
- API endpoints (middleware)
- Componentes (PermissionGate component)

### 3. Sistema de Auditoría Completo

Todas las acciones importantes se registran automáticamente:
- **Quién**: Usuario que realizó la acción
- **Qué**: Tipo de acción (login, update, delete)
- **Cuándo**: Timestamp exacto
- **Dónde**: Dirección IP y user agent (dispositivo)
- **Cambios**: Valores anteriores y nuevos (para updates)

**Casos de auditoría**:
- Autenticación (login, logout, reset password)
- Gestión de usuarios y roles
- Cambios de permisos
- Cambios de configuración

**Consulta**: Tabla AuditLog con filtros por usuario, acción, fecha, área

### 4. Logging Estructurado y Observable

Sistema de logging profesional con **Pino**:
- Logs en formato JSON para fácil procesamiento
- Contexto automático (IP, userAgent, requestId)
- Request ID para correlación de logs
- Niveles: info, warn, error
- Performance tracking de operaciones

**Almacenamiento**: Stdout + archivos (configurable)

### 5. Menú Dinámico Basado en Permisos

- Menú generado desde BD
- Adapta contenido según permisos del usuario
- Estructura jerárquica (items padre-hijo)
- Caché en memoria para performance
- Invalidación automática de caché

### 6. Sistema de Eventos

Arquitectura desacoplada basada en eventos:

**Eventos disponibles**:
- `USER_REGISTERED` - Nuevo usuario registrado
- `PASSWORD_RESET_REQUESTED` - Solicitud de reset
- `USER_LOGGED_OUT` - Usuario cerró sesión
- `AUDIT_LOG_CREATED` - Acción registrada

**Listeners**: Email, auditoría, logs

---

## Stack Tecnológico

### Frontend & Framework
| Componente | Versión | Propósito |
|-----------|---------|----------|
| Next.js | 16.0.5 | Framework full-stack |
| React | 19.2.0 | Librería UI |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 4.x | Estilos utility-first |
| shadcn/ui | latest | Componentes UI |

### Backend & Datos
| Componente | Versión | Propósito |
|-----------|---------|----------|
| Prisma | 6.18.0 | ORM y esquema |
| PostgreSQL | 14+ | Base de datos relacional |
| Auth.js | 5.0 beta | Autenticación |

### Validación & Seguridad
| Componente | Versión | Propósito |
|-----------|---------|----------|
| Zod | 4.1.12 | Validación de esquemas |
| bcryptjs | 2.4.3 | Hash de contraseñas |
| uuid | 10.0.0 | IDs únicos |

### Observabilidad
| Componente | Versión | Propósito |
|-----------|---------|----------|
| Pino | 10.1.0 | Logging estructurado |
| pino-pretty | 10.2.3 | Formato legible en desarrollo |

### Comunicación
| Componente | Versión | Propósito |
|-----------|---------|----------|
| Nodemailer | 7.0.10 | Envío de emails |
| react-hook-form | latest | Gestión de formularios |

### Testing
| Componente | Versión | Propósito |
|-----------|---------|----------|
| Vitest | latest | Test runner |
| Testing Library | latest | Testing de componentes |
| @vitest/ui | latest | Dashboard de tests |

---

## Arquitectura

### Patrones Arquitectónicos

#### 1. Module-First Architecture (Arquitectura por Módulos)

La aplicación se organiza en tres módulos principales:

```
src/modules/
├── shared/     # Código compartido entre todos los módulos
├── admin/      # Módulo de administración
└── public/     # Módulo público (usuarios sin autenticación)
```

**Ventajas**:
- Bajo acoplamiento
- Fácil de entender
- Escalable horizontalmente
- Cada módulo es independiente

#### 2. Container/Presentation Pattern (Patrón Contenedor/Presentación)

En cada módulo:
- **Containers**: Componentes inteligentes que conectan con datos
  - Hacen fetch de datos
  - Manejan lógica de estado
  - Llaman a server actions
  - Pasan datos a presentacionales

- **Presentational**: Componentes UI puros
  - Props-driven
  - Reutilizables
  - Fáciles de testear
  - Sin lógica de datos

Ejemplo:
```typescript
// Container: conecta datos
<AuditLogTableContainer userId={userId} />
  └─ <AuditLogTable logs={logs} isLoading={isLoading} /> // Presentational
```

#### 3. Server-Driven Security (Seguridad Impulsada por Servidor)

- Validación de permisos siempre en servidor
- Nunca confiar en cliente para seguridad
- Tokens JWT con scopes limitados
- Sesiones BD para revocar acceso

#### 4. Unified Error Handling (Manejo Uniforme de Errores)

Type `ActionResponse<T>` para todas las respuestas:

```typescript
interface ActionResponse<T> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string>
}
```

#### 5. Event-Driven Architecture (Arquitectura Impulsada por Eventos)

Desacoplamiento mediante eventos:
- Acciones principales disparan eventos
- Listeners suscritos reaccionan (email, auditoría, logs)
- Fácil agregar nuevos listeners sin cambiar código existente

---

## Estructura del Proyecto

### Raíz del Proyecto

```
application-base/
├── src/                           # Código fuente
├── app/                          # Rutas de Next.js (App Router)
├── prisma/                       # ORM y esquema
├── scripts/                      # Scripts de utilidad
├── templates/                    # Plantillas de email
├── public/                       # Archivos estáticos
├── docs/                         # Documentación adicional
├── .next/                        # Build output
├── coverage/                     # Cobertura de tests
├── node_modules/                 # Dependencias
├── DOCUMENTACION.md              # Este archivo
├── README.md                     # Información general
├── package.json                  # Dependencias y scripts
├── package-lock.json             # Lock file
├── tsconfig.json                 # Configuración TypeScript
├── next.config.ts                # Configuración Next.js
├── tailwind.config.ts            # Configuración Tailwind
├── postcss.config.mjs            # Configuración PostCSS
├── vitest.config.ts              # Configuración de tests
├── vitest.setup.ts               # Setup de tests
├── eslint.config.mjs             # Configuración ESLint
├── components.json               # Configuración shadcn/ui
├── prisma.config.ts              # Configuración Prisma
├── Dockerfile                    # Imagen Docker
└── README.md                     # Información general
```

### Estructura de Módulos (src/modules/)

```
src/modules/
│
├── shared/                               # 🟢 CÓDIGO COMPARTIDO
│   ├── api/                             # Queries y helpers API
│   │   ├── email-service.ts             # Servicio de emails
│   │   ├── user-queries.ts              # Queries de usuarios
│   │   ├── session-queries.ts           # Queries de sesiones
│   │   └── api-helpers.ts               # Helpers de API
│   │
│   ├── types/                           # Tipos TypeScript compartidos
│   │   ├── auth.ts                      # Tipos de autenticación
│   │   ├── session.ts                   # Tipos de sesión
│   │   ├── index.ts                     # Exportaciones
│   │   └── ...
│   │
│   ├── validations/                     # Esquemas Zod
│   │   ├── auth.ts                      # Validaciones de auth
│   │   ├── profile.ts                   # Validaciones de perfil
│   │   └── index.ts                     # Exportaciones
│   │
│   ├── hooks/                           # React hooks custom
│   │   ├── use-auth.ts                  # Acceso a autenticación
│   │   ├── use-debounce.ts              # Debounce
│   │   ├── use-mobile.ts                # Detectar móvil
│   │   └── index.ts                     # Exportaciones
│   │
│   ├── utils/                           # Funciones utilitarias
│   │   ├── session-utils.ts             # Utilidades de sesión
│   │   ├── user-agent-parser.ts         # Parser de user agent
│   │   └── ...
│   │
│   ├── components/                      # Componentes compartidos
│   │   ├── layout/                      # Componentes de layout
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   └── ...
│   │   ├── presentational/              # Componentes UI puros
│   │   │   ├── login-form.tsx
│   │   │   ├── permission-gate.tsx
│   │   │   └── ...
│   │   └── utils/                       # Helpers de componentes
│   │
│   ├── constants/                       # Constantes
│   │   ├── api-routes.ts                # URLs de API
│   │   ├── permissions.ts               # Permisos definidos
│   │   └── ...
│   │
│   └── index.ts                         # Barrel exports
│
├── admin/                                # 🔴 MÓDULO ADMINISTRATIVO
│   ├── components/                      # Componentes admin
│   │   ├── containers/                  # Smart components
│   │   │   ├── account-info-container.tsx
│   │   │   ├── app-sidebar-container.tsx
│   │   │   ├── audit-log-table-container.tsx
│   │   │   └── ...
│   │   └── presentational/              # Componentes UI
│   │       ├── sidebar.tsx
│   │       ├── user-form.tsx
│   │       └── ...
│   │
│   ├── services/                        # Queries y helpers admin
│   │   ├── audit-service.ts             # Servicio de auditoría
│   │   ├── audit-helpers.ts             # Helpers de auditoría
│   │   ├── menu-queries.ts              # Queries de menú
│   │   └── permission-queries.ts        # Queries de permisos
│   │
│   ├── hooks/                           # Hooks admin
│   │   └── use-audit-logs.ts            # Fetch logs con paginación
│   │
│   ├── types/                           # Tipos admin
│   │   ├── audit.ts                     # Tipos de auditoría
│   │   ├── menu.ts                      # Tipos de menú
│   │   └── ...
│   │
│   ├── utils/                           # Utilidades admin
│   │   ├── permission-utils.ts          # Helpers de permisos
│   │   ├── icon-mapper.ts               # Mapper de iconos
│   │   └── ...
│   │
│   ├── layout/                          # Layouts admin
│   │   └── admin-layout.tsx
│   │
│   └── index.ts                         # Barrel exports
│
└── public/                               # 🟡 MÓDULO PÚBLICO
    ├── components/                      # Componentes públicos
    │   ├── containers/
    │   └── presentational/
    ├── services/
    ├── hooks/
    ├── types/
    ├── utils/
    ├── layout/
    └── index.ts
```

### Estructura de Rutas (app/ - App Router)

```
app/
├── api/                                  # 🔴 API ROUTES
│   ├── auth/
│   │   ├── [...nextauth]/                # Auth.js endpoint
│   │   ├── reset-password/               # POST reset password
│   │   └── validate-reset-token/         # POST validar token
│   │
│   ├── admin/                            # Rutas admin protegidas
│   │   ├── users/                        # Gestión de usuarios
│   │   │   ├── route.ts                  # GET/POST
│   │   │   └── [id]/route.ts             # GET/PUT/DELETE
│   │   ├── roles/                        # Gestión de roles
│   │   ├── permissions/                  # Listado de permisos
│   │   ├── menu/                         # Menú dinámico
│   │   └── audit/                        # Logs de auditoría
│   │
│   ├── customer/                         # Rutas usuario autenticado
│   │   ├── profile/                      # Perfil de usuario
│   │   ├── menu/                         # Menú personalizado
│   │   └── change-password/              # Cambio de contraseña
│   │
│   └── public/
│       └── health/                       # Health check
│
├── admin/                                # 🔴 RUTAS ADMIN
│   ├── auth/                             # Autenticación admin
│   │   ├── signin/page.tsx               # Login
│   │   ├── forgot-password/page.tsx      # Solicitar reset
│   │   └── reset-password/page.tsx       # Formulario reset
│   │
│   └── (protected)/                      # Rutas protegidas
│       ├── dashboard/page.tsx            # Panel principal
│       ├── audit/page.tsx                # Logs de auditoría
│       ├── settings/page.tsx             # Configuración
│       ├── users/                        # Gestión de usuarios
│       │   ├── page.tsx                  # Listado
│       │   ├── new/page.tsx              # Crear nuevo
│       │   └── [id]/page.tsx             # Editar
│       ├── roles/page.tsx                # Gestión de roles
│       └── permissions/page.tsx          # Gestión de permisos
│
├── (public)/                             # 🟡 RUTAS PÚBLICAS
│   ├── page.tsx                          # Página inicio
│   ├── about/page.tsx                    # Acerca de
│   └── ...
│
├── layout.tsx                            # Layout raíz
├── not-found.tsx                         # 404
└── error.tsx                             # Error handling
```

### Estructura de Librería (src/lib/)

```
src/lib/
├── auth.ts                              # Configuración Auth.js
├── auth-utils.ts                        # Helpers de autenticación
│
├── logger/
│   ├── structured-logger.ts             # Logger principal
│   ├── logger-helpers.ts                # Helpers de logging
│   ├── request-id.ts                    # Generación de request ID
│   └── ...
│
├── events/
│   ├── event-bus.ts                     # Bus de eventos (singleton)
│   ├── listeners/
│   │   ├── email-listener.ts            # Listener de email
│   │   ├── audit-listener.ts            # Listener de auditoría
│   │   └── ...
│   └── ...
│
├── prisma/
│   ├── connection.ts                    # PrismaClient singleton
│   ├── queries.ts                       # Queries reutilizables
│   └── types.ts                         # Tipos extraídos del schema
│
├── menu/
│   ├── menu-builder.ts                  # Constructor de menú
│   └── menu-cache.ts                    # Caché del menú
│
├── rate-limiter.ts                      # Rate limiting por IP
├── config.ts                            # Configuración general
├── env.ts                               # Variables de entorno validadas
└── ...
```

---

## Módulos Principales

### 1. Módulo Shared (Compartido)

**Responsabilidad**: Código reutilizable entre todos los módulos

#### Submodelos:

**api/**
- Queries de BD compartidas
- Servicio de emails
- Helpers API (respuestas HTTP, middlewares)

**types/**
- Tipos TypeScript compartidos
- Interfaces de objetos principales
- Types de acciones

**validations/**
- Esquemas Zod para formularios
- Validaciones de entrada
- Error handling uniforme

**hooks/**
- `use-auth`: Acceso a sesión actual
- `use-debounce`: Debounce de valores
- `use-mobile`: Detección de dispositivo móvil

**components/**
- Componentes de layout (header, footer, sidebar)
- Componentes UI (LoginForm, PermissionGate, etc.)
- Utilidades de componentes

**constants/**
- Rutas API
- Permisos definidos
- URLs de navegación

---

### 2. Módulo Admin

**Responsabilidad**: Panel de administración de la aplicación

#### Funcionalidades:

1. **Gestión de Usuarios**
   - CRUD de usuarios
   - Asignación de roles
   - Reset de contraseña como admin
   - Bloqueo/desbloqueo de cuentas

2. **Gestión de Roles y Permisos**
   - CRUD de roles
   - Asignación de permisos a roles
   - Visualización de matriz de permisos
   - Herencia de permisos

3. **Auditoría**
   - Visualización de logs
   - Filtros (usuario, acción, fecha, área)
   - Exportación de reportes
   - Búsqueda de cambios

4. **Configuración**
   - Configuración global
   - Parámetros de email
   - Políticas de contraseña

5. **Menú Dinámico**
   - Generación automática basada en permisos
   - Personalización por rol
   - Caché para performance

#### Estructura:

```
admin/
├── components/
│   ├── containers/          # Smart components
│   └── presentational/       # UI components
├── services/                # Queries y helpers
├── hooks/                   # use-audit-logs, etc
├── types/                   # Tipos admin específicos
├── utils/                   # permission-utils, icon-mapper
└── layout/                  # Layout admin
```

#### Rutas Protegidas:

- `/admin/dashboard` - Panel principal
- `/admin/users` - Gestión de usuarios
- `/admin/roles` - Gestión de roles
- `/admin/permissions` - Gestión de permisos
- `/admin/audit` - Logs de auditoría
- `/admin/settings` - Configuración

---

### 3. Módulo Public

**Responsabilidad**: Funcionalidades disponibles para usuarios públicos/no autenticados

#### Componentes:

- Página de inicio
- Página de login
- Página de registro
- Páginas de información (about, contact, etc.)
- Reset de contraseña público

#### Rutas:

- `/` - Página inicio
- `/auth/signin` - Login
- `/auth/register` - Registro
- `/auth/forgot-password` - Solicitar reset
- `/auth/reset-password` - Cambiar contraseña

---

## Módulo Lib (Librería Principal)

### 1. Auth System

**Archivo**: `src/lib/auth.ts`, `src/lib/auth-utils.ts`

**Características**:
- Auth.js v5 con CredentialsProvider
- Hybrid JWT + BD Sessions
- Password hashing con bcryptjs
- Token generation para reset

**Funciones principales**:
- `signIn(email, password)` - Login
- `signUp(email, password, name)` - Registro
- `requestPasswordReset(email)` - Solicitar reset
- `resetPassword(token, newPassword)` - Cambiar contraseña

### 2. Logger System

**Archivo**: `src/lib/logger/structured-logger.ts`

**Características**:
- Pino logger con JSON output
- Request ID tracking automático
- Contexto enriquecido (IP, userAgent, userId)
- Performance metrics

**Uso**:
```typescript
import { logger } from '@/lib/logger'

logger.info('User login', { userId: '123', ip: '192.168.1.1' })
logger.error('Database error', { error: err, query: 'SELECT...' })
```

### 3. Event Bus

**Archivo**: `src/lib/events/event-bus.ts`

**Eventos disponibles**:
- `USER_REGISTERED` - Nuevo usuario registrado
- `PASSWORD_RESET_REQUESTED` - Reset solicitado
- `USER_LOGGED_OUT` - Usuario cerró sesión
- `AUDIT_LOG_CREATED` - Acción auditada

**Uso**:
```typescript
// Emitir evento
eventBus.emit('USER_REGISTERED', { userId, email })

// Escuchar evento
eventBus.on('USER_REGISTERED', async (data) => {
  // Enviar email bienvenida
})
```

### 4. Prisma ORM

**Archivo**: `src/lib/prisma/connection.ts`

**Configuración**:
- PostgreSQL como base de datos
- Client singleton
- Logging de queries en desarrollo

**Entidades principales**:
- User - Usuarios
- UserCredentials - Credenciales (contraseña hasheada)
- Session - Sesiones activas
- Role - Roles RBAC
- Permission - Permisos
- AuditLog - Logs de auditoría
- MenuItem - Items de menú dinámico
- PasswordResetToken - Tokens para reset

### 5. Rate Limiter

**Archivo**: `src/lib/rate-limiter.ts`

**Propósito**: Proteger API endpoints de abuso

**Configuración**: Por defecto limita a X requests por IP en Y minutos

---

## Configuración

### Variables de Entorno (.env.local)

```bash
# Base de Datos
DATABASE_URL="postgresql://user:password@localhost:5432/aurora_nova_db"

# Autenticación
NEXTAUTH_SECRET="genera-una-clave-segura-aleatorio"
NEXTAUTH_URL="http://localhost:3000"

# Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-contraseña-app"
SMTP_FROM="noreply@example.com"

# Logging (opcional)
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"

# Features (opcional)
FEATURE_AUDIT_ENABLED="true"
FEATURE_EMAIL_ENABLED="true"
```

### Configuración TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "esnext",
    "target": "es2020",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/modules/shared/*": ["./src/modules/shared/*"],
      "@/modules/admin/*": ["./src/modules/admin/*"],
      "@/modules/public/*": ["./src/modules/public/*"]
    }
  }
}
```

### Configuración Next.js (next.config.ts)

```typescript
output: 'standalone'
serverExternalPackages: [
  '@prisma/client',
  'bcryptjs',
  'pino',
  'pino-pretty',
  'thread-stream'
]
```

---

## Primeros Pasos

### Requisitos Previos

- Node.js 18+
- npm/pnpm/yarn/bun
- PostgreSQL 14+ (local o cloud)
- Git

### 1. Clonar el Repositorio

```bash
git clone <repositorio>
cd aurora-nova/application-base
```

### 2. Instalar Dependencias

```bash
npm install
# o
pnpm install
```

### 3. Configurar Base de Datos

```bash
# Copiar template de .env
cp .env.example .env.local

# Editar .env.local con credenciales DB
nano .env.local
```

### 4. Crear Esquema de BD

```bash
# Generar Prisma Client
npm run db:generate

# Crear schema en BD
npm run db:push
```

### 5. Crear Super Administrador

```bash
npm run db:create-super-admin
# Te pedirá: email, contraseña, nombre
```

### 6. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Accede a `http://localhost:3000`

### 7. Login Inicial

```
Email: tu-email@example.com
Password: la-que-configuraste
```

Después del login, verás el dashboard admin con todas las funcionalidades.

---

## Desarrollo

### Estructura de Desarrollo

El desarrollo en Aurora Nova sigue estos principios:

1. **TDD (Test-Driven Development)**: Escribe tests primero
2. **TypeScript Strict**: Todo código tipado completamente
3. **Cambios pequeños**: Commits pequeños e incrementales
4. **Código limpio**: Nombres claros, funciones pequeñas
5. **Documentación**: Cambios deben documentarse

### Workflow de Desarrollo

#### 1. Crear Feature Branch

```bash
git checkout -b feature/nombre-funcionalidad
# o
git checkout -b fix/nombre-bug
```

#### 2. Implementar Funcionalidad

```bash
# Estructura típica:
# 1. Crear test que falla
# 2. Escribir código que pasa test
# 3. Refactorizar
# 4. Actualizar documentación
```

#### 3. Ejecutar Tests

```bash
npm run test                # Watch mode
npm run test:run          # Una sola ejecución
npm run test:coverage     # Con cobertura
npm run test:ui           # Dashboard visual
```

#### 4. Ejecutar Linting

```bash
npm run lint
```

#### 5. Build para Verificar

```bash
npm run build
```

#### 6. Hacer Commit

```bash
git add .
git commit -m "feat: descripción clara del cambio"
git push origin feature/nombre-funcionalidad
```

#### 7. Pull Request

Abre PR para fusionar en `main`

### Guía de Nuevas Funcionalidades

#### Agregar Nuevo Endpoint API

1. **Crear API route** en `app/api/.../route.ts`
2. **Validar permisos** con `getCurrentSession()`
3. **Usar Zod** para validar entrada
4. **Retornar ActionResponse**
5. **Crear test**

Ejemplo:

```typescript
// app/api/admin/users/route.ts
import { getCurrentSession } from '@/lib/auth'
import { db } from '@/lib/prisma/connection'
import { createUserSchema } from '@/modules/shared/validations/auth'
import type { ActionResponse } from '@/modules/shared/types'
import type { User } from '@prisma/client'

export async function POST(req: Request): Promise<Response> {
  try {
    // Validar sesión y permisos
    const session = await getCurrentSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Validar entrada
    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors
      } as ActionResponse<null>, { status: 400 })
    }

    // Crear usuario
    const user = await db.user.create({
      data: parsed.data
    })

    // Retornar respuesta
    return Response.json({
      success: true,
      data: user
    } as ActionResponse<User>)
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### Agregar Nuevo Componente Admin

1. **Crear container** en `modules/admin/components/containers/`
2. **Crear presentational** en `modules/admin/components/presentational/`
3. **Crear test**
4. **Integrar en layout**

Ejemplo:

```typescript
// modules/admin/components/containers/user-list-container.tsx
'use client'
import { useEffect, useState } from 'react'
import { getUsersAction } from '@/actions/users'
import UserListTable from '../presentational/user-list-table'
import type { User } from '@prisma/client'

export default function UserListContainer() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      const result = await getUsersAction()
      if (result.success && result.data) {
        setUsers(result.data)
      }
      setIsLoading(false)
    }
    fetchUsers()
  }, [])

  return <UserListTable users={users} isLoading={isLoading} />
}
```

#### Agregar Nueva Validación

1. **Crear schema Zod** en `modules/shared/validations/`
2. **Usar en formularios y API**
3. **Crear test**

Ejemplo:

```typescript
// modules/shared/validations/user.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener mayúscula')
    .regex(/[0-9]/, 'Debe tener número'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido')
})

export type CreateUser = z.infer<typeof createUserSchema>
```

### Server Actions

Las acciones del servidor se ubican en `src/actions/`:

```typescript
// src/actions/users.ts
'use server'

import { getCurrentSession } from '@/lib/auth'
import { db } from '@/lib/prisma/connection'
import { createUserSchema } from '@/modules/shared/validations/user'
import type { ActionResponse } from '@/modules/shared/types'

export async function createUserAction(
  input: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await getCurrentSession()
    if (!session?.user?.id) {
      return { success: false, error: 'No autorizado' }
    }

    const parsed = createUserSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors
      }
    }

    const user = await db.user.create({ data: parsed.data })

    return { success: true, data: { id: user.id } }
  } catch (error) {
    return { success: false, error: 'Error creando usuario' }
  }
}
```

---

## Testing

### Estructura de Tests

```
src/
└── [modulo]/
    └── __tests__/
        ├── unit/
        ├── integration/
        └── e2e/
```

### Ejecutar Tests

```bash
# Watch mode
npm run test

# Una sola ejecución
npm run test:run

# Con cobertura
npm run test:coverage

# Dashboard visual
npm run test:ui
```

### Escribir un Test

```typescript
// src/actions/__tests__/unit/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loginUserAction } from '@/actions/auth'

describe('Auth Actions', () => {
  describe('loginUserAction', () => {
    it('debe retornar error si credentials son inválidas', async () => {
      const result = await loginUserAction({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('debe retornar token si credentials son válidas', async () => {
      const result = await loginUserAction({
        email: 'admin@example.com',
        password: 'ValidPassword123'
      })

      expect(result.success).toBe(true)
      expect(result.data?.sessionToken).toBeDefined()
    })
  })
})
```

### Cobertura Esperada

- **Unit Tests**: 80%+ cobertura
- **Integration Tests**: Flujos principales
- **E2E Tests**: Rutas críticas

---

## Deployment

### Build para Producción

```bash
npm run build
```

Esto crea el build en `.next/`

### Ejecutar en Producción

```bash
npm run start
```

Servidor escucha en puerto 3000 (configurable con PORT env var)

### Docker

```bash
# Construir imagen
docker build -t aurora-nova:1.0.0 .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXTAUTH_SECRET="..." \
  aurora-nova:1.0.0
```

### Variables de Entorno en Producción

- `DATABASE_URL` - Conexión PostgreSQL
- `NEXTAUTH_SECRET` - Secret para JWT (usar valor aleatorio seguro)
- `NEXTAUTH_URL` - URL pública de la app
- `SMTP_*` - Credenciales para emails
- `NODE_ENV=production`

### Checklist de Deployment

- [ ] Build ejecuta sin errores
- [ ] Tests pasan (100%)
- [ ] Linting sin warnings
- [ ] Variables de entorno configuradas
- [ ] BD migrada (`npm run db:deploy`)
- [ ] Super admin creado
- [ ] HTTPS habilitado
- [ ] Logs configurados
- [ ] Backups de BD configurados
- [ ] Monitoreo habilitado

---

## Solución de Problemas

### "error: Cannot find module @prisma/client"

**Solución**:
```bash
npm run db:generate
```

### "Error connecting to database"

**Verificar**:
1. PostgreSQL está corriendo
2. DATABASE_URL es correcto
3. Credenciales son válidas
4. Red permite conexión

```bash
# Probar conexión
psql $DATABASE_URL -c "SELECT 1"
```

### "NEXTAUTH_SECRET not found"

**Solución**:
```bash
# Generar secret seguro
openssl rand -base64 32 > .env.local
# Agregar al .env.local: NEXTAUTH_SECRET="valor-generado"
```

### Tests fallando

**Solución**:
```bash
# Limpiar caché de vitest
rm -rf node_modules/.vitest

# Reinstalar
npm install

# Ejecutar tests
npm run test:run
```

### Build fallando con TypeScript

**Soluciones**:
```bash
# Limpiar build anterior
rm -rf .next

# Rebuild
npm run build

# Si persiste, revisar errores de tipo
npx tsc --noEmit
```

### Email no se envía

**Verificar**:
1. Variables SMTP configuradas
2. Credenciales correctas
3. Logs de aplicación para errores
4. Provider permite conexiones (Gmail requiere contraseña de app)

```bash
# Ver logs de email
npm run dev 2>&1 | grep -i email
```

---

## Documentación Adicional

- **[README.md](./README.md)** - Información general del proyecto
- **[CLAUDE.md](../CLAUDE.md)** - Principios y estándares del proyecto
- **[API Spec](../docs/api-spec.yml)** - Especificación OpenAPI
- **[Architecture](../docs/architecture.md)** - Detalles de arquitectura
- **[Database Model](../docs/data-model.md)** - Modelo de datos

---

## Soporte y Contribución

### Reportar Bugs

1. Verificar que el bug existe en la versión actual
2. Crear issue con detalles claros
3. Incluir pasos para reproducir
4. Adjuntar logs relevantes

### Sugerir Mejoras

1. Abrir discussion en el repositorio
2. Describir el caso de uso
3. Proponer solución (opcional)
4. Esperar feedback de mantenedores

### Contribuir Código

1. Fork el repositorio
2. Crear branch feature/fix
3. Hacer cambios siguiendo estándares
4. Pasar tests y linting
5. Hacer pull request
6. Esperar revisión y feedback

---

## Historial de Versiones

### v1.0.0 (Diciembre 2025) - ✅ ESTABLE

Primera versión estable de Aurora Nova Application Base.

**Características incluidas**:
- ✅ Sistema de autenticación híbrido JWT + BD
- ✅ RBAC (Control de acceso basado en roles)
- ✅ Auditoría completa
- ✅ Logging estructurado
- ✅ Menú dinámico
- ✅ Sistema de eventos
- ✅ Componentes admin completos
- ✅ Testing comprehensive
- ✅ Documentación completa

**Cambios desde beta**:
- Correcciones de seguridad
- Optimizaciones de performance
- Mejoras en documentación
- Fixes de bugs reportados

---

## Licencia

[Especificar licencia de tu proyecto]

---

**Última actualización**: Diciembre 2025
**Versión**: 1.0.0 Estable
**Mantenedor**: [Tu nombre/equipo]

Para preguntas o soporte: [Email/Slack/Discord]
