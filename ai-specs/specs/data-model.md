# Modelo de Datos - Aurora Nova

## Información del Proyecto

**Nombre del Proyecto**: Aurora Nova - Sistema RBAC
**Descripción**: Sistema de autenticación y autorización basado en roles con sistema híbrido JWT + Database
**Base de Datos**: PostgreSQL 18+ (con soporte para UUID v7)
**ORM**: Prisma
**Framework de Autenticación**: Auth.js (Next Auth v5)

---

## Arquitectura del Modelo de Datos

El modelo de datos de Aurora Nova está organizado en **3 módulos principales**:

1. **Auth.js Tables**: Tablas requeridas por Auth.js para autenticación
2. **Authentication Tables**: Sistema RBAC personalizado (Roles y Permisos)
3. **Menu System**: Sistema de menú dinámico con control de acceso

---

## Descripciones de los Modelos

### 1. Auth.js Tables

#### User (Usuario)

**Descripción**: Representa un usuario registrado en el sistema con capacidad de autenticación. Extiende el modelo base de Auth.js con campos personalizados de Aurora Nova.

**Campos**:
- `id`: UUID v7 - Identificador único del usuario generado por la base de datos (Clave Primaria)
- `name`: String - Nombre completo del usuario (Opcional, usado por Auth.js)
- `email`: String - Dirección de correo electrónico (Obligatorio, Único)
- `emailVerified`: DateTime - Fecha de verificación del email (Opcional, usado por Auth.js)
- `image`: String - URL de la imagen de perfil (Opcional, usado por Auth.js)
- `firstName`: String - Nombre del usuario (Opcional, máx. 255 caracteres)
- `lastName`: String - Apellido del usuario (Opcional, máx. 255 caracteres)
- `createdAt`: DateTime - Fecha de creación (generada automáticamente)
- `updatedAt`: DateTime - Fecha de última actualización (generada automáticamente)

**Reglas de Validación**:
- Email debe ser único en el sistema
- Email debe tener formato válido
- ID se genera automáticamente usando UUID v7 (secuencial y ordenable)

**Relaciones**:
- `accounts`: Relación uno-a-muchos con Account (OAuth providers)
- `sessions`: Relación uno-a-muchos con Session (sesiones activas del usuario)
- `credentials`: Relación uno-a-uno con UserCredentials (contraseña hasheada)
- `userRoles`: Relación uno-a-muchos con UserRole (roles asignados al usuario)
- `createdRoles`: Relación uno-a-muchos con UserRole (roles que este usuario asignó a otros)
- `passwordResetTokens`: Relación uno-a-muchos con PasswordResetToken (tokens de recuperación de contraseña)

**Índices**:
- `email`: Para búsquedas rápidas por email durante login y validaciones de unicidad

---

#### Account (Cuenta de Proveedor OAuth)

**Descripción**: Almacena información de cuentas de proveedores OAuth (Google, GitHub, etc.). Requerido por Auth.js.

**Campos**:
- `userId`: UUID - ID del usuario asociado (Clave Foránea)
- `type`: String - Tipo de cuenta (oauth, email, credentials)
- `provider`: String - Nombre del proveedor (google, github, etc.)
- `providerAccountId`: String - ID de la cuenta en el proveedor
- `refresh_token`: String - Token de actualización (Opcional)
- `access_token`: String - Token de acceso (Opcional)
- `expires_at`: Int - Timestamp de expiración del token (Opcional)
- `token_type`: String - Tipo de token (Bearer, etc.) (Opcional)
- `scope`: String - Alcances del token (Opcional)
- `id_token`: String - ID token de OpenID Connect (Opcional)
- `session_state`: String - Estado de la sesión OAuth (Opcional)

**Reglas de Validación**:
- La combinación de `provider` + `providerAccountId` debe ser única (Clave Primaria Compuesta)
- `userId` debe referenciar un usuario existente

**Relaciones**:
- `user`: Relación muchos-a-uno con User (onDelete: Cascade)

**Índices**:
- `userId`: Para búsquedas rápidas de cuentas de un usuario

---

#### Session (Sesión)

**Descripción**: Almacena sesiones activas de usuarios. Implementa el **sistema híbrido JWT + Database** de Aurora Nova, guardando información de IP y User Agent para auditoría.

**Campos**:
- `sessionToken`: String - Token único de la sesión (Clave Primaria)
- `userId`: UUID - ID del usuario asociado (Clave Foránea)
- `expires`: DateTime - Fecha de expiración de la sesión (Obligatorio)
- `createdAt`: DateTime - Fecha de creación de la sesión (generada automáticamente)
- `ipAddress`: String - Dirección IP desde donde se creó la sesión (Opcional)
- `userAgent`: String - User Agent del navegador (Opcional)

**Reglas de Validación**:
- `sessionToken` debe ser único
- `expires` debe ser una fecha futura al momento de creación
- `userId` debe referenciar un usuario existente

**Relaciones**:
- `user`: Relación muchos-a-uno con User (onDelete: Cascade)

**Índices**:
- `userId`: Para listar sesiones de un usuario
- `expires`: Para limpiar sesiones expiradas
- `createdAt`: Para auditoría y ordenamiento cronológico

**Notas**:
- Esta tabla es parte del **sistema híbrido JWT + Database**:
  - El JWT contiene el `sessionToken` para vincular con este registro
  - Al hacer logout, se elimina el registro de esta tabla (invalida sesión)
  - Permite gestión manual de sesiones y auditoría completa

---

#### VerificationToken (Token de Verificación)

**Descripción**: Almacena tokens para verificación de email. Requerido por Auth.js para flujos de verificación.

**Campos**:
- `identifier`: String - Identificador (típicamente email) (Parte de Clave Primaria)
- `token`: String - Token de verificación (Parte de Clave Primaria)
- `expires`: DateTime - Fecha de expiración del token

**Reglas de Validación**:
- La combinación de `identifier` + `token` debe ser única (Clave Primaria Compuesta)
- `expires` debe ser una fecha futura

**Relaciones**: Ninguna (tabla independiente)

**Índices**: Clave primaria compuesta por `identifier` + `token`

---

#### PasswordResetToken (Token de Recuperación de Contraseña)

**Descripción**: Almacena tokens para recuperación de contraseña. Los tokens se hashean con SHA-256 antes de guardarse y expiran en 30 minutos.

**Campos**:
- `id`: String (CUID) - Identificador único del registro (Clave Primaria)
- `token`: String - Token hasheado (SHA-256) (Único)
- `expiresAt`: DateTime - Fecha de expiración del token (30 minutos desde creación)
- `userId`: UUID - ID del usuario que solicitó el reset (Clave Foránea)
- `createdAt`: DateTime - Fecha de creación (generada automáticamente)

**Reglas de Validación**:
- `token` debe ser único
- `expiresAt` debe ser una fecha futura (30 minutos)
- `userId` debe referenciar un usuario existente

**Relaciones**:
- `user`: Relación muchos-a-uno con User (onDelete: Cascade)

**Índices**:
- `userId`: Para listar tokens de un usuario

**Notas**:
- El token original (sin hashear) se envía por email al usuario
- Se hashea con SHA-256 antes de guardarse en BD
- Se elimina automáticamente después de usarse o al expirar

---

### 2. Authentication Tables (Sistema RBAC)

#### UserCredentials (Credenciales de Usuario)

**Descripción**: Almacena la contraseña hasheada del usuario para autenticación con credenciales. Separado de la tabla User para mejor seguridad y flexibilidad.

**Campos**:
- `userId`: UUID - ID del usuario (Clave Primaria y Clave Foránea)
- `hashedPassword`: String - Contraseña hasheada con bcrypt (máx. 255 caracteres)
- `createdAt`: DateTime - Fecha de creación (generada automáticamente)
- `updatedAt`: DateTime - Fecha de última actualización (generada automáticamente)

**Reglas de Validación**:
- `userId` debe referenciar un usuario existente (relación 1:1)
- `hashedPassword` debe ser un hash de bcrypt válido (mínimo 60 caracteres)

**Relaciones**:
- `user`: Relación uno-a-uno con User (onDelete: Cascade)

**Índices**:
- `userId`: Clave primaria y foránea

**Notas**:
- Las contraseñas se hashean con bcrypt (12 rounds)
- Esta separación permite:
  - Usuarios sin contraseña (solo OAuth)
  - Mejor auditoría de cambios de contraseña
  - Aislamiento de datos sensibles

---

#### Role (Rol)

**Descripción**: Define roles en el sistema RBAC. Un rol agrupa permisos y se asigna a usuarios.

**Campos**:
- `id`: UUID v7 - Identificador único del rol (Clave Primaria)
- `name`: String - Nombre del rol (Único, máx. 50 caracteres)
- `description`: String - Descripción del rol (Opcional)
- `createdAt`: DateTime - Fecha de creación (generada automáticamente)
- `updatedAt`: DateTime - Fecha de última actualización (generada automáticamente)

**Reglas de Validación**:
- `name` debe ser único
- `name` debe tener entre 1 y 50 caracteres
- `name` no puede estar vacío

**Relaciones**:
- `userRoles`: Relación uno-a-muchos con UserRole (usuarios con este rol)
- `rolePermissions`: Relación uno-a-muchos con RolePermission (permisos del rol)

**Índices**: Ninguno adicional (solo clave primaria)

**Ejemplos de Roles**:
- Super Admin
- Administrator
- User Manager
- Viewer

---

#### Permission (Permiso)

**Descripción**: Define permisos granulares en el sistema RBAC. Usa IDs semánticos (ej: "user:create", "role:delete").

**Campos**:
- `id`: String - ID semántico del permiso (Clave Primaria, máx. 100 caracteres)
  - Formato: `modulo:accion` (ej: "user:create", "role:update")
- `module`: String - Módulo al que pertenece el permiso (máx. 50 caracteres)
- `description`: String - Descripción del permiso (Opcional)
- `createdAt`: DateTime - Fecha de creación (generada automáticamente)

**Reglas de Validación**:
- `id` debe ser único y seguir el formato `modulo:accion`
- `module` agrupa permisos relacionados

**Relaciones**:
- `rolePermissions`: Relación uno-a-muchos con RolePermission (roles con este permiso)
- `menuItems`: Relación uno-a-muchos con MenuItem (items del menú que requieren este permiso)

**Índices**: Ninguno adicional (solo clave primaria)

**Ejemplos de Permisos**:
- `user:create` - Crear usuarios
- `user:read` - Leer usuarios
- `user:update` - Actualizar usuarios
- `user:delete` - Eliminar usuarios
- `role:manage` - Gestionar roles
- `permission:manage` - Gestionar permisos

---

#### UserRole (Relación Usuario-Rol)

**Descripción**: Tabla intermedia para la relación muchos-a-muchos entre User y Role. Incluye auditoría de quién asignó el rol.

**Campos**:
- `userId`: UUID - ID del usuario (Parte de Clave Primaria, Clave Foránea)
- `roleId`: UUID - ID del rol (Parte de Clave Primaria, Clave Foránea)
- `createdAt`: DateTime - Fecha de asignación (generada automáticamente)
- `createdBy`: UUID - ID del usuario que asignó el rol (Opcional, Clave Foránea)

**Reglas de Validación**:
- La combinación de `userId` + `roleId` debe ser única (Clave Primaria Compuesta)
- `userId` debe referenciar un usuario existente
- `roleId` debe referenciar un rol existente
- `createdBy` debe referenciar un usuario existente (si está presente)

**Relaciones**:
- `user`: Relación muchos-a-uno con User (onDelete: Cascade)
- `role`: Relación muchos-a-uno con Role (onDelete: Restrict)
- `creator`: Relación muchos-a-uno con User (usuario que asignó el rol)

**Índices**:
- `userId`: Para listar roles de un usuario
- `roleId`: Para listar usuarios con un rol específico

**Notas**:
- `onDelete: Cascade` en `user`: Si se elimina un usuario, se eliminan sus roles
- `onDelete: Restrict` en `role`: No se puede eliminar un rol si tiene usuarios asignados

---

#### RolePermission (Relación Rol-Permiso)

**Descripción**: Tabla intermedia para la relación muchos-a-muchos entre Role y Permission.

**Campos**:
- `roleId`: UUID - ID del rol (Parte de Clave Primaria, Clave Foránea)
- `permissionId`: String - ID del permiso (Parte de Clave Primaria, Clave Foránea, máx. 100 caracteres)
- `createdAt`: DateTime - Fecha de asignación (generada automáticamente)

**Reglas de Validación**:
- La combinación de `roleId` + `permissionId` debe ser única (Clave Primaria Compuesta)
- `roleId` debe referenciar un rol existente
- `permissionId` debe referenciar un permiso existente

**Relaciones**:
- `role`: Relación muchos-a-uno con Role (onDelete: Cascade)
- `permission`: Relación muchos-a-uno con Permission (onDelete: Cascade)

**Índices**:
- `roleId`: Para listar permisos de un rol
- `permissionId`: Para listar roles con un permiso específico

**Notas**:
- `onDelete: Cascade`: Si se elimina un rol o permiso, se eliminan las asignaciones

---

### 3. Menu System

#### MenuItem (Item de Menú)

**Descripción**: Define items del menú de navegación dinámico. Soporta estructura jerárquica (grupos y sub-items) y control de acceso basado en permisos.

**Campos**:
- `id`: UUID v7 - Identificador único del item (Clave Primaria)
- `title`: String - Título del item visible en el menú (máx. 100 caracteres)
- `href`: String - Ruta de navegación (Opcional, máx. 255 caracteres)
  - NULL para grupos (items sin enlace)
  - Path para enlaces directos (ej: "/users", "/dashboard")
- `icon`: String - Nombre del icono de Lucide (Opcional, máx. 50 caracteres)
- `order`: Int - Orden de aparición en el menú (default: 0)
- `isActive`: Boolean - Indica si el item está activo (default: true)
- `permissionId`: String - ID del permiso requerido para ver este item (Opcional, Clave Foránea)
- `parentId`: UUID - ID del item padre (Opcional, Clave Foránea para jerarquía)
- `createdAt`: DateTime - Fecha de creación (generada automáticamente)
- `updatedAt`: DateTime - Fecha de última actualización (generada automáticamente)

**Reglas de Validación**:
- `title` no puede estar vacío
- `href` es NULL para grupos, requerido para enlaces directos
- `order` define la posición en el menú (menor = primero)
- `parentId` debe referenciar otro MenuItem existente (para sub-items)
- `permissionId` debe referenciar un Permission existente (si está presente)

**Relaciones**:
- `permission`: Relación muchos-a-uno con Permission (onDelete: SetNull)
- `parent`: Relación muchos-a-uno con MenuItem (auto-referencia, onDelete: Cascade)
- `children`: Relación uno-a-muchos con MenuItem (auto-referencia)

**Índices**:
- `parentId`: Para listar items hijos de un grupo
- `order`: Para ordenar items en el menú
- `isActive`: Para filtrar items activos
- `permissionId`: Para verificar permisos de acceso

**Notas**:
- Estructura jerárquica: Items pueden tener hijos (sub-menú)
- Control de acceso: Si `permissionId` está definido, solo usuarios con ese permiso ven el item
- Flexibilidad: Items pueden ser grupos (sin `href`) o enlaces directos (con `href`)

**Ejemplos**:
```typescript
// Grupo (sin href)
{
  title: "Administración",
  href: null,
  icon: "Settings",
  order: 10,
  parentId: null
}

// Enlace directo con permiso
{
  title: "Usuarios",
  href: "/users",
  icon: "Users",
  order: 1,
  parentId: "uuid-admin-group",
  permissionId: "user:read"
}
```

---

## Tipos de Relaciones en Aurora Nova

### Uno a Uno (1:1)
**User ←→ UserCredentials**
- Un usuario tiene exactamente un conjunto de credenciales
- Un conjunto de credenciales pertenece a exactamente un usuario
- Implementado con: `userId` como PK y FK en UserCredentials

### Uno a Muchos (1:N)
**User → Sessions**
- Un usuario puede tener múltiples sesiones activas
- Una sesión pertenece a un solo usuario

**User → PasswordResetTokens**
- Un usuario puede tener múltiples tokens de reset (históricos)
- Un token pertenece a un solo usuario

**MenuItem → MenuItems** (Auto-referencia)
- Un item de menú puede tener múltiples hijos
- Un hijo pertenece a un solo padre

### Muchos a Muchos (N:M)
**User ←→ Role** (a través de UserRole)
- Un usuario puede tener múltiples roles
- Un rol puede ser asignado a múltiples usuarios
- Tabla intermedia: UserRole

**Role ←→ Permission** (a través de RolePermission)
- Un rol puede tener múltiples permisos
- Un permiso puede pertenecer a múltiples roles
- Tabla intermedia: RolePermission

---

## Diagrama Entidad-Relación

```mermaid
erDiagram
    User {
        UUID id PK
        String email UK
        String name
        DateTime emailVerified
        String image
        String firstName
        String lastName
        DateTime createdAt
        DateTime updatedAt
    }

    Account {
        String userId FK
        String type
        String provider
        String providerAccountId
        String refresh_token
        String access_token
        Int expires_at
    }

    Session {
        String sessionToken PK
        UUID userId FK
        DateTime expires
        DateTime createdAt
        String ipAddress
        String userAgent
    }

    VerificationToken {
        String identifier PK
        String token PK
        DateTime expires
    }

    PasswordResetToken {
        String id PK
        String token UK
        UUID userId FK
        DateTime expiresAt
        DateTime createdAt
    }

    UserCredentials {
        UUID userId PK_FK
        String hashedPassword
        DateTime createdAt
        DateTime updatedAt
    }

    Role {
        UUID id PK
        String name UK
        String description
        DateTime createdAt
        DateTime updatedAt
    }

    Permission {
        String id PK
        String module
        String description
        DateTime createdAt
    }

    UserRole {
        UUID userId PK_FK
        UUID roleId PK_FK
        UUID createdBy FK
        DateTime createdAt
    }

    RolePermission {
        UUID roleId PK_FK
        String permissionId PK_FK
        DateTime createdAt
    }

    MenuItem {
        UUID id PK
        String title
        String href
        String icon
        Int order
        Boolean isActive
        String permissionId FK
        UUID parentId FK
        DateTime createdAt
        DateTime updatedAt
    }

    %% Auth.js Relations
    User ||--o{ Account : "tiene"
    User ||--o{ Session : "tiene"
    User ||--o{ PasswordResetToken : "solicita"
    User ||--|| UserCredentials : "tiene"

    %% RBAC Relations
    User ||--o{ UserRole : "tiene"
    Role ||--o{ UserRole : "asignado_a"
    User ||--o{ UserRole : "asigna (createdBy)"
    Role ||--o{ RolePermission : "tiene"
    Permission ||--o{ RolePermission : "asignado_a"

    %% Menu Relations
    Permission ||--o{ MenuItem : "protege"
    MenuItem ||--o{ MenuItem : "contiene (parentId)"
```

---

## Principios de Diseño del Modelo

### 1. Normalización
- **Nivel de normalización**: 3NF (Tercera Forma Normal)
- **Razón**: Balance entre integridad de datos y performance
- **Excepciones**:
  - `User.name` se desnormaliza (duplica `firstName` + `lastName`) para compatibilidad con Auth.js

### 2. Integridad Referencial

Todas las claves foráneas tienen estrategias `onDelete` y `onUpdate` definidas:

| Relación | onDelete | Razón |
|----------|----------|-------|
| Account → User | Cascade | Si se elimina usuario, eliminar sus cuentas OAuth |
| Session → User | Cascade | Si se elimina usuario, eliminar sus sesiones |
| UserCredentials → User | Cascade | Si se elimina usuario, eliminar sus credenciales |
| PasswordResetToken → User | Cascade | Si se elimina usuario, eliminar sus tokens |
| UserRole → User | Cascade | Si se elimina usuario, eliminar sus roles asignados |
| UserRole → Role | Restrict | No permitir eliminar rol si tiene usuarios asignados |
| RolePermission → Role | Cascade | Si se elimina rol, eliminar sus permisos |
| RolePermission → Permission | Cascade | Si se elimina permiso, eliminar asignaciones a roles |
| MenuItem → Permission | SetNull | Si se elimina permiso, el item queda sin protección |
| MenuItem → MenuItem | Cascade | Si se elimina padre, eliminar hijos |

### 3. Auditoría

**Campos de Auditoría Estándar**:
- `createdAt`: Fecha de creación (todas las tablas)
- `updatedAt`: Fecha de actualización (tablas modificables)

**Auditoría Adicional**:
- `Session.ipAddress` y `Session.userAgent`: Para tracking de sesiones
- `UserRole.createdBy`: Para saber quién asignó un rol

**Soft Delete**: No implementado actualmente
- Consideración futura: Agregar `deletedAt` para soft delete de usuarios

### 4. Flexibilidad

**Decisiones que permiten evolución**:
- **Permisos con IDs semánticos**: Fácil de entender y mantener
- **Menú dinámico**: Permite cambios sin modificar código
- **Estructura jerárquica en MenuItem**: Soporta menús de N niveles
- **Separación User/UserCredentials**: Permite usuarios sin contraseña (solo OAuth)

### 5. Performance

**Índices Estratégicos**:
- `User.email`: Login y validaciones de unicidad
- `Session.userId`, `Session.expires`, `Session.createdAt`: Gestión de sesiones
- `UserRole.userId`, `UserRole.roleId`: Consultas RBAC
- `RolePermission.roleId`, `RolePermission.permissionId`: Consultas RBAC
- `MenuItem.parentId`, `MenuItem.order`, `MenuItem.isActive`: Renderizado de menú

**Consideraciones de Performance**:
- UUID v7 (secuencial) mejora performance en índices vs UUID v4
- Índices compuestos en tablas intermedias
- Desnormalización controlada (User.name)

---

## Sistema Híbrido JWT + Database

Aurora Nova implementa un **sistema híbrido de autenticación** único:

### Arquitectura

1. **JWT para Autenticación**:
   - Auth.js crea JWT con estrategia "jwt"
   - JWT contiene datos del usuario + `sessionToken`
   - Validación rápida sin consultas a BD en cada request

2. **Database para Gestión de Sesiones**:
   - Tabla `Session` almacena sesiones activas
   - Incluye IP y User Agent para auditoría
   - Permite invalidación manual de sesiones

### Flujo de Login

1. Usuario envía credenciales
2. Server Action `loginUser()` captura IP y UserAgent con `headers()`
3. Auth.js valida credenciales en callback `authorize()`
4. Callback `jwt()` crea sesión en BD con `createSession()`
5. `sessionToken` se guarda en JWT
6. JWT se devuelve al cliente como cookie

### Flujo de Logout

1. Usuario solicita logout
2. Server Action `logoutUser()` obtiene sesión actual
3. Extrae `sessionToken` del JWT
4. Elimina registro de tabla `Session` (invalida sesión)
5. Auth.js elimina cookie del JWT

### Ventajas

- ✅ Performance: Validación JWT sin BD
- ✅ Auditoría: IP, UserAgent, timestamps en BD
- ✅ Gestión: Listar y cerrar sesiones manualmente
- ✅ Seguridad: Invalidación inmediata de sesiones

### Archivos Clave

- `src/lib/auth.ts`: Callbacks de Auth.js (jwt, session)
- `src/actions/auth.ts`: Server actions (loginUser, logoutUser)
- `src/lib/prisma/session-queries.ts`: Queries de sesión

---

## Seguridad

### Datos Sensibles

**Contraseñas**:
- Hasheadas con bcrypt (12 rounds)
- Almacenadas en tabla separada `UserCredentials`
- Nunca se exponen en APIs o logs

**Tokens de Reset**:
- Hasheados con SHA-256 antes de guardarse
- Expiran en 30 minutos
- Se eliminan después de usar

**Session Tokens**:
- Generados con `crypto.randomUUID()`
- Almacenados en JWT (firmado)
- Vinculados con registro en BD

### PII (Información Personal Identificable)

**Datos PII**:
- `User.email`
- `User.firstName`
- `User.lastName`
- `Session.ipAddress`
- `Session.userAgent`

**Protección**:
- Acceso controlado por RBAC
- Logs sanitizados (no incluyen datos sensibles)
- APIs requieren autenticación

### Cumplimiento

**Consideraciones**:
- **GDPR**: Derecho al olvido (eliminar usuario elimina todos sus datos en cascada)
- **Auditoría**: Logs de sesiones y asignación de roles
- **Retención de Datos**: Tokens de reset expiran automáticamente

---

## Migraciones y Versionado

### Herramienta
- **Prisma Migrate**: Sistema de migraciones declarativo

### Estrategia

**Desarrollo**:
```bash
# Crear migración y aplicar
npm run db:migrate

# Regenerar cliente Prisma
npm run db:generate

# Resetear BD (⚠️ destruye datos)
npm run db:reset
```

**Producción**:
```bash
# Solo aplicar migraciones (no crea nuevas)
npm run db:deploy
```

### Ubicación
- Migraciones: `prisma/migrations/`
- Schema: `prisma/schema.prisma`
- Seeds: `scripts/seed.ts`

---

## Seeds y Datos Iniciales

### Script de Seed
`scripts/seed.ts` inicializa:

1. **Permisos Base**: CRUD para users, roles, permissions
2. **Rol Super Admin**: Con todos los permisos
3. **Menú Base**: Estructura de navegación inicial

### Ejecutar Seeds
```bash
npm run db:seed
```

### Crear Super Admin
```bash
npm run db:create-super-admin
```

---

## Consultas Comunes

### Obtener Permisos de un Usuario

```typescript
// Vía roles asignados
const userWithPermissions = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    }
  }
});

// Extraer permisos únicos
const permissions = userWithPermissions.userRoles
  .flatMap(ur => ur.role.rolePermissions)
  .map(rp => rp.permission.id);

const uniquePermissions = [...new Set(permissions)];
```

### Obtener Menú Filtrado por Permisos

```typescript
const userPermissions = await getUserPermissions(userId);

const menu = await prisma.menuItem.findMany({
  where: {
    isActive: true,
    parentId: null,
    OR: [
      { permissionId: null }, // Items públicos
      { permissionId: { in: userPermissions } } // Items con permiso
    ]
  },
  include: {
    children: {
      where: {
        isActive: true,
        OR: [
          { permissionId: null },
          { permissionId: { in: userPermissions } }
        ]
      },
      orderBy: { order: 'asc' }
    }
  },
  orderBy: { order: 'asc' }
});
```

### Verificar si Usuario Tiene Permiso

```typescript
const hasPermission = await prisma.userRole.findFirst({
  where: {
    userId: userId,
    role: {
      rolePermissions: {
        some: {
          permissionId: 'user:create'
        }
      }
    }
  }
});

return !!hasPermission;
```

---

## Notas Adicionales

### Limitaciones Conocidas

1. **Soft Delete**: No implementado
   - Consideración futura para cumplimiento de auditorías

2. **Multi-tenancy**: No soportado
   - Modelo actual es single-tenant
   - Requeriría agregar `tenantId` a todas las tablas

3. **Histórico de Cambios**: No implementado
   - Solo se guarda estado actual
   - Consideración futura: Tabla de auditoría genérica

### Planes Futuros

1. **Cache de Permisos**: Redis para cachear permisos de usuarios
2. **Soft Delete**: Agregar `deletedAt` a tablas principales
3. **Auditoría Completa**: Tabla de eventos de auditoría
4. **Multi-tenancy**: Agregar soporte para múltiples organizaciones

---

## Referencias

### Archivos del Proyecto
- **Schema**: `application-base/prisma/schema.prisma`
- **Migraciones**: `application-base/prisma/migrations/`
- **Seeds**: `application-base/scripts/seed.ts`
- **Queries**: `application-base/src/lib/prisma/queries.ts`
- **Session Queries**: `application-base/src/lib/prisma/session-queries.ts`
- **Permission Queries**: `application-base/src/lib/prisma/permission-queries.ts`

### Documentación Externa
- [Prisma Docs](https://www.prisma.io/docs)
- [Auth.js Docs](https://authjs.dev)
- [PostgreSQL UUID v7](https://www.postgresql.org/docs/current/uuid-ossp.html)

---

**Última Actualización**: 2025-11-29
**Versión del Modelo**: 1.0.0
**Mantenido por**: Equipo Aurora Nova
