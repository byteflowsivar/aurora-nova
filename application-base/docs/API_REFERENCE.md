# API Reference - Aurora Nova

Documentación completa de todos los endpoints disponibles en Aurora Nova.

## Tabla de Contenidos

1. [Autenticación](#autenticación-auth)
2. [Admin - Usuarios](#admin---usuarios)
3. [Admin - Roles](#admin---roles)
4. [Admin - Permisos](#admin---permisos)
5. [Admin - Menú](#admin---menú)
6. [Admin - Auditoría](#admin---auditoría)
7. [Customer - Perfil](#customer---perfil)
8. [Customer - Sesiones](#customer---sesiones)
9. [Public - Health](#public---health)

---

## Autenticación (`/api/auth`)

### POST /api/auth/[...nextauth]

**Descripción**: Manejo de autenticación con NextAuth (login, logout, callbacks)

**Métodos**: POST, GET

**Autenticación**: Pública

**Características**:
- Login con email/contraseña
- Proveedores OAuth (si configurados)
- Generación de JWT firmado
- Creación de sesión en BD

**Responsable**: `src/lib/auth/auth.ts` (configuración NextAuth)

---

### POST /api/auth/reset-password

**Descripción**: Reiniciar contraseña usando token de reset

**Endpoint**: `POST /api/auth/reset-password`

**Autenticación**: Pública (token requerido)

**Body**:
```json
{
  "token": "string (uuid v4 hasheado)",
  "password": "string (mín 8 caracteres)"
}
```

**Respuestas**:
- `200`: `{ message: "Contraseña actualizada exitosamente." }`
- `400`: `{ error: "Token inválido o ya ha sido usado." }` | `{ error: "El token ha expirado." }`
- `404`: `{ error: "Usuario no encontrado." }`
- `500`: `{ error: "Ocurrió un error en el servidor." }`

**Seguridad**:
- ✓ Tokens guardados como hash SHA-256
- ✓ Contraseña nueva hasheada con bcryptjs (12 rounds)
- ✓ Token con expiración de 30 minutos
- ✓ Token se elimina después de usar (reutilización imposible)
- ✓ Todas las sesiones invalidadas (force re-login)
- ✓ Transacción atómica garantiza consistencia

**Flujo Típico**:
1. Usuario solicita reset (forgot-password)
2. Email enviado con link que contiene token
3. Usuario hace click en link
4. POST /api/auth/reset-password con token + password
5. Contraseña actualizada, todas las sesiones invalidadas
6. Usuario debe hacer login con nueva contraseña

**Archivo**: `src/app/api/auth/reset-password/route.ts`

---

### GET /api/auth/validate-reset-token

**Descripción**: Validar que un token de reset sea válido antes de mostrar formulario

**Endpoint**: `GET /api/auth/validate-reset-token`

**Autenticación**: Pública

**Query Parameters**:
- `token` (string, requerido): Token a validar

**Respuestas**:
- `200`: `{ valid: true | false }`
- `400`: `{ valid: false, error: "Token no proporcionado." }`
- `500`: `{ valid: false, error: "Error del servidor." }`

**Uso Típico**:
```typescript
// En página reset-password, validar token antes de mostrar form
const response = await fetch(`/api/auth/validate-reset-token?token=${token}`)
const { valid } = await response.json()
if (!valid) {
  // Mostrar error: token expirado o inválido
}
```

**Archivo**: `src/app/api/auth/validate-reset-token/route.ts`

---

## Admin - Usuarios

### GET /api/admin/users

**Descripción**: Listar todos los usuarios del sistema

**Endpoint**: `GET /api/admin/users`

**Autenticación**: Requerida (permiso: `user:list`)

**Respuesta** (200):
```json
[
  {
    "id": "uuid",
    "name": "Juan Pérez",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "emailVerified": "2024-01-01T00:00:00Z" | null,
    "image": "https://example.com/avatar.jpg" | null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-12-05T12:00:00Z",
    "roles": [
      { "id": "uuid", "name": "admin", "description": "..." }
    ]
  }
]
```

**Errores**:
- `401`: Usuario no autenticado
- `403`: Permiso denegado (`user:list` requerido)
- `500`: Error del servidor

**Archivo**: `src/app/api/admin/users/route.ts`

---

### POST /api/admin/users

**Descripción**: Crear nuevo usuario

**Endpoint**: `POST /api/admin/users`

**Autenticación**: Requerida (permiso: `user:create`)

**Body**:
```json
{
  "firstName": "string (requerido)",
  "lastName": "string (requerido)",
  "email": "string (email válido, único)",
  "password": "string (mín 6 caracteres)"
}
```

**Respuesta** (201):
```json
{
  "id": "uuid",
  "email": "nuevo@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "name": "Juan Pérez",
  "image": null,
  "emailVerified": null,
  "createdAt": "2024-12-05T12:00:00Z",
  "updatedAt": "2024-12-05T12:00:00Z"
}
```

**Errores**:
- `400`: Validación fallida (email existe, validación de campos)
- `401`: No autenticado
- `403`: Permiso denegado
- `500`: Error del servidor

**Auditoría**: Se registra evento `USER_CREATED` con usuario, email, timestamp

**Archivo**: `src/app/api/admin/users/route.ts`

---

### GET /api/admin/users/[id]

**Descripción**: Obtener detalles de usuario específico

**Endpoint**: `GET /api/admin/users/[id]`

**Autenticación**: Requerida (permiso: `user:read`)

**Parámetros**:
- `id` (uuid, en URL): ID del usuario

**Respuesta** (200): Objeto usuario con roles y permisos

**Errores**:
- `401`: No autenticado
- `403`: Permiso denegado
- `404`: Usuario no encontrado
- `500`: Error del servidor

**Archivo**: `src/app/api/admin/users/[id]/route.ts`

---

### PATCH /api/admin/users/[id]

**Descripción**: Actualizar información de usuario

**Endpoint**: `PATCH /api/admin/users/[id]`

**Autenticación**: Requerida (permiso: `user:update`)

**Body** (opcional):
```json
{
  "firstName": "string",
  "lastName": "string",
  "image": "url"
}
```

**Respuesta** (200): Usuario actualizado

**Auditoría**: Se registra `USER_UPDATED`

**Archivo**: `src/app/api/admin/users/[id]/route.ts`

---

### DELETE /api/admin/users/[id]

**Descripción**: Eliminar usuario del sistema

**Endpoint**: `DELETE /api/admin/users/[id]`

**Autenticación**: Requerida (permiso: `user:delete`)

**Respuesta** (200):
```json
{ "message": "Usuario eliminado exitosamente." }
```

**Efectos secundarios**:
- ✓ Se eliminan todas las sesiones del usuario
- ✓ Se eliminan todas las asignaciones de rol
- ✓ Se registra evento `USER_DELETED`

**Archivo**: `src/app/api/admin/users/[id]/route.ts`

---

### GET /api/admin/users/[id]/roles

**Descripción**: Listar roles asignados a un usuario

**Endpoint**: `GET /api/admin/users/[id]/roles`

**Autenticación**: Requerida (permiso: `role:read`)

**Respuesta** (200):
```json
[
  { "id": "uuid", "name": "admin", "description": "..." }
]
```

**Archivo**: `src/app/api/admin/users/[id]/roles/route.ts`

---

### POST /api/admin/users/[id]/roles

**Descripción**: Asignar rol a usuario

**Endpoint**: `POST /api/admin/users/[id]/roles`

**Autenticación**: Requerida (permiso: `role:assign`)

**Body**:
```json
{
  "roleId": "uuid"
}
```

**Respuesta** (200):
```json
{
  "success": true,
  "message": "Rol asignado exitosamente.",
  "userId": "uuid",
  "roleId": "uuid",
  "action": "assigned"
}
```

**Auditoría**: Se registra `ROLE_ASSIGNED`

**Archivo**: `src/app/api/admin/users/[id]/roles/route.ts`

---

### DELETE /api/admin/users/[id]/roles/[roleId]

**Descripción**: Remover rol de usuario

**Endpoint**: `DELETE /api/admin/users/[id]/roles/[roleId]`

**Autenticación**: Requerida (permiso: `role:unassign`)

**Respuesta** (200):
```json
{
  "success": true,
  "message": "Rol removido exitosamente.",
  "userId": "uuid",
  "roleId": "uuid",
  "action": "removed"
}
```

**Auditoría**: Se registra `ROLE_REMOVED`

**Archivo**: `src/app/api/admin/users/[id]/roles/route.ts`

---

### GET /api/admin/users/[id]/permissions

**Descripción**: Listar permisos efectivos del usuario (desde sus roles)

**Endpoint**: `GET /api/admin/users/[id]/permissions`

**Autenticación**: Requerida (permiso: `permission:read`)

**Respuesta** (200):
```json
[
  { "id": "user:create", "module": "user", "description": "Crear usuarios" },
  { "id": "user:read", "module": "user", "description": "Ver usuarios" }
]
```

**Nota**: Permisos se calculan combinando todos los permisos de todos los roles del usuario

**Archivo**: `src/app/api/admin/users/[id]/permissions/route.ts`

---

## Admin - Roles

### GET /api/admin/roles

**Descripción**: Listar todos los roles del sistema

**Endpoint**: `GET /api/admin/roles`

**Autenticación**: Requerida (permiso: `role:list`)

**Respuesta** (200):
```json
[
  {
    "id": "uuid",
    "name": "admin",
    "description": "Administrador del sistema",
    "permissions": [
      { "id": "user:create", "module": "user", "description": "..." }
    ]
  }
]
```

**Archivo**: `src/app/api/admin/roles/route.ts`

---

### POST /api/admin/roles

**Descripción**: Crear nuevo rol

**Endpoint**: `POST /api/admin/roles`

**Autenticación**: Requerida (permiso: `role:create`)

**Body**:
```json
{
  "name": "string (único, minúsculas)",
  "description": "string"
}
```

**Respuesta** (201): Rol creado

**Auditoría**: Se registra `ROLE_CREATED`

**Archivo**: `src/app/api/admin/roles/route.ts`

---

### GET /api/admin/roles/[id]

**Descripción**: Obtener detalles de rol específico

**Endpoint**: `GET /api/admin/roles/[id]`

**Autenticación**: Requerida (permiso: `role:read`)

**Respuesta** (200): Rol con permisos asociados

**Archivo**: `src/app/api/admin/roles/[id]/route.ts`

---

### PATCH /api/admin/roles/[id]

**Descripción**: Actualizar rol

**Endpoint**: `PATCH /api/admin/roles/[id]`

**Autenticación**: Requerida (permiso: `role:update`)

**Body**:
```json
{
  "name": "string",
  "description": "string"
}
```

**Respuesta** (200): Rol actualizado

**Auditoría**: Se registra `ROLE_UPDATED`

**Archivo**: `src/app/api/admin/roles/[id]/route.ts`

---

### DELETE /api/admin/roles/[id]

**Descripción**: Eliminar rol

**Endpoint**: `DELETE /api/admin/roles/[id]`

**Autenticación**: Requerida (permiso: `role:delete`)

**Respuesta** (200):
```json
{ "message": "Rol eliminado exitosamente." }
```

**Restricciones**:
- ✗ No se puede eliminar rol si usuarios lo tienen asignado
- ✗ No se pueden eliminar roles del sistema (admin, user)

**Auditoría**: Se registra `ROLE_DELETED`

**Archivo**: `src/app/api/admin/roles/[id]/route.ts`

---

### POST /api/admin/roles/[id]/permissions

**Descripción**: Asignar permiso a rol

**Endpoint**: `POST /api/admin/roles/[id]/permissions`

**Autenticación**: Requerida (permiso: `permission:assign`)

**Body**:
```json
{
  "permissionId": "string (ej: 'user:create')"
}
```

**Respuesta** (200):
```json
{
  "success": true,
  "message": "Permiso asignado al rol exitosamente."
}
```

**Auditoría**: Se registra `PERMISSION_GRANTED`

**Archivo**: `src/app/api/admin/roles/[id]/permissions/route.ts`

---

### DELETE /api/admin/roles/[id]/permissions/[permissionId]

**Descripción**: Remover permiso de rol

**Endpoint**: `DELETE /api/admin/roles/[id]/permissions/[permissionId]`

**Autenticación**: Requerida (permiso: `permission:revoke`)

**Respuesta** (200):
```json
{
  "success": true,
  "message": "Permiso removido del rol exitosamente."
}
```

**Auditoría**: Se registra `PERMISSION_REVOKED`

**Archivo**: `src/app/api/admin/roles/[id]/permissions/route.ts`

---

## Admin - Permisos

### GET /api/admin/permissions

**Descripción**: Listar todos los permisos disponibles en el sistema

**Endpoint**: `GET /api/admin/permissions`

**Autenticación**: Requerida (permiso: `permission:list`)

**Respuesta** (200):
```json
[
  {
    "id": "user:create",
    "module": "user",
    "description": "Crear nuevos usuarios"
  },
  {
    "id": "user:read",
    "module": "user",
    "description": "Ver información de usuarios"
  }
]
```

**Nota**: Permisos son definidos en `src/modules/admin/types/permissions.ts` como `SYSTEM_PERMISSIONS`

**Archivo**: `src/app/api/admin/permissions/route.ts`

---

## Admin - Menú

### GET /api/admin/menu

**Descripción**: Obtener estructura de menú dinámico (filtrado por permisos del usuario)

**Endpoint**: `GET /api/admin/menu`

**Autenticación**: Requerida

**Respuesta** (200):
```json
[
  {
    "id": "dashboard",
    "label": "Dashboard",
    "href": "/admin/dashboard",
    "icon": "LayoutDashboard",
    "order": 1,
    "permission": null
  },
  {
    "id": "users",
    "label": "Usuarios",
    "href": "/admin/users",
    "icon": "Users",
    "order": 2,
    "permission": "user:read"
  }
]
```

**Nota**: Solo retorna items para los cuales el usuario tiene permisos

**Archivo**: `src/app/api/admin/menu/route.ts`

---

### GET /api/admin/menu/[id]

**Descripción**: Obtener detalles de un item de menú específico

**Endpoint**: `GET /api/admin/menu/[id]`

**Autenticación**: Requerida

**Parámetros**:
- `id` (string, en URL): ID del item de menú

**Respuesta** (200): Objeto MenuItem

**Archivo**: `src/app/api/admin/menu/[id]/route.ts`

---

### POST /api/admin/menu

**Descripción**: Crear nuevo item de menú

**Endpoint**: `POST /api/admin/menu`

**Autenticación**: Requerida (permiso: `menu:create`)

**Body**:
```json
{
  "label": "string",
  "href": "string (ruta válida)",
  "icon": "string (nombre de icono Lucide)",
  "permission": "string (permiso requerido)" | null,
  "order": "number"
}
```

**Respuesta** (201): Item de menú creado

**Auditoría**: Se registra evento

**Archivo**: `src/app/api/admin/menu/route.ts`

---

### PATCH /api/admin/menu/[id]

**Descripción**: Actualizar item de menú

**Endpoint**: `PATCH /api/admin/menu/[id]`

**Autenticación**: Requerida (permiso: `menu:update`)

**Body**: Campos a actualizar (parcial)

**Respuesta** (200): Item actualizado

**Archivo**: `src/app/api/admin/menu/[id]/route.ts`

---

### DELETE /api/admin/menu/[id]

**Descripción**: Eliminar item de menú

**Endpoint**: `DELETE /api/admin/menu/[id]`

**Autenticación**: Requerida (permiso: `menu:delete`)

**Respuesta** (200):
```json
{ "message": "Item de menú eliminado exitosamente." }
```

**Archivo**: `src/app/api/admin/menu/[id]/route.ts`

---

### POST /api/admin/menu/reorder

**Descripción**: Reordenar items de menú

**Endpoint**: `POST /api/admin/menu/reorder`

**Autenticación**: Requerida (permiso: `menu:update`)

**Body**:
```json
{
  "menuItems": [
    { "id": "uuid", "order": 1 },
    { "id": "uuid", "order": 2 }
  ]
}
```

**Respuesta** (200):
```json
{ "message": "Menú reordenado exitosamente." }
```

**Archivo**: `src/app/api/admin/menu/reorder/route.ts`

---

## Admin - Auditoría

### GET /api/admin/audit

**Descripción**: Obtener registros de auditoría del sistema

**Endpoint**: `GET /api/admin/audit`

**Autenticación**: Requerida (permiso: `audit:read`)

**Query Parameters**:
- `limit` (number, default 50): Número de registros a retornar
- `offset` (number, default 0): Desplazamiento para paginación
- `userId` (uuid, opcional): Filtrar por usuario específico
- `action` (string, opcional): Filtrar por tipo de acción

**Respuesta** (200):
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "action": "USER_CREATED",
    "resource": "user",
    "resourceId": "uuid",
    "changes": {
      "email": "nuevo@example.com",
      "firstName": "Juan"
    },
    "timestamp": "2024-12-05T12:00:00Z",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
]
```

**Acciones Auditadas**:
- `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`
- `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`
- `ROLE_ASSIGNED`, `ROLE_REMOVED`
- `PERMISSION_GRANTED`, `PERMISSION_REVOKED`
- `LOGIN`, `LOGOUT`, `PASSWORD_CHANGED`

**Archivo**: `src/app/api/admin/audit/route.ts`

---

## Customer - Perfil

### GET /api/customer/profile

**Descripción**: Obtener perfil del usuario autenticado

**Endpoint**: `GET /api/customer/profile`

**Autenticación**: Requerida

**Respuesta** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "name": "Juan Pérez",
  "image": "https://example.com/avatar.jpg",
  "emailVerified": "2024-01-01T00:00:00Z" | null,
  "roles": [...],
  "permissions": [...]
}
```

**Archivo**: `src/app/api/customer/profile/route.ts`

---

### PATCH /api/customer/profile

**Descripción**: Actualizar perfil del usuario autenticado

**Endpoint**: `PATCH /api/customer/profile`

**Autenticación**: Requerida

**Body**:
```json
{
  "firstName": "string",
  "lastName": "string",
  "image": "url" | null
}
```

**Respuesta** (200): Perfil actualizado

**Validación**:
- firstName: no vacío, máximo 100 caracteres
- lastName: no vacío, máximo 100 caracteres
- image: URL válida o null

**Auditoría**: Se registra `PROFILE_UPDATED`

**Archivo**: `src/app/api/customer/profile/route.ts`

---

## Customer - Contraseña

### POST /api/customer/change-password

**Descripción**: Cambiar contraseña del usuario autenticado

**Endpoint**: `POST /api/customer/change-password`

**Autenticación**: Requerida

**Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string (mín 8 caracteres)",
  "confirmPassword": "string (debe coincidir con newPassword)"
}
```

**Validación**:
- currentPassword: debe coincidir con contraseña actual
- newPassword: debe cumplir reglas de fuerza
- confirmPassword: debe coincidir exactamente con newPassword
- newPassword: no puede ser igual a currentPassword

**Respuesta** (200):
```json
{ "message": "Contraseña actualizada exitosamente." }
```

**Errores**:
- `400`: Validación fallida o contraseña actual incorrecta
- `401`: No autenticado
- `500`: Error del servidor

**Auditoría**: Se registra `PASSWORD_CHANGED`

**Seguridad**:
- ✓ Contraseña actual verificada con bcryptjs
- ✓ Nueva contraseña hasheada con bcryptjs (12 rounds)
- ✓ Sesión no se invalida (usuario sigue logueado)

**Archivo**: `src/app/api/customer/change-password/route.ts`

---

## Customer - Menú

### GET /api/customer/menu

**Descripción**: Obtener menú filtrado por permisos del usuario

**Endpoint**: `GET /api/customer/menu`

**Autenticación**: Requerida

**Respuesta** (200): Array de MenuItems (igual que /api/admin/menu pero solo items permitidos)

**Nota**: Usado para renderizar sidebar/navigation en cliente

**Archivo**: `src/app/api/customer/menu/route.ts`

---

## Public - Health

### GET /api/public/health

**Descripción**: Health check de la aplicación (sin autenticación)

**Endpoint**: `GET /api/public/health`

**Autenticación**: Pública

**Respuesta** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-12-05T12:00:00Z",
  "version": "1.0.0"
}
```

**Uso**: Verificar que API está disponible, health checks en infraestructura

**Archivo**: `src/app/api/public/health/route.ts`

---

## Códigos de Error Estándar

| Código | Significado | Caso de Uso |
|--------|-------------|-----------|
| `200` | OK | Operación exitosa |
| `201` | Created | Recurso creado exitosamente |
| `400` | Bad Request | Validación fallida, parámetros inválidos |
| `401` | Unauthorized | Usuario no autenticado |
| `403` | Forbidden | Usuario autenticado pero sin permisos |
| `404` | Not Found | Recurso no encontrado |
| `409` | Conflict | Conflicto (ej: email ya existe) |
| `500` | Internal Server Error | Error del servidor |

---

## Patrones de Autenticación y Autorización

### Autenticación NextAuth

Todos los endpoints de admin/customer requieren autenticación. Se valida:
1. JWT presente en cookie segura (`__Secure-next-auth.session-token`)
2. JWT válido (no expirado, firma válida)
3. Sesión existe en BD (no se hizo logout omnibus)

### Autorización RBAC

Endpoints específicos requieren permisos. Validación:
1. Obtener usuario autenticado
2. Obtener permisos del usuario (desde JWT o BD)
3. Verificar que tiene permiso requerido
4. Si no: retornar 403 Forbidden

**Ejemplo**:
```typescript
await requirePermission(SYSTEM_PERMISSIONS.USER_LIST)  // 403 si no tiene permiso
```

---

## Auditoría

Todas las operaciones se registran en tabla `audit_logs`:
- Quién: usuario ID
- Qué: acción realizada (USER_CREATED, etc)
- Cuándo: timestamp ISO
- Dónde: IP address y User-Agent
- Cambios: qué se modificó (para UPDATE)

---

## Errores Comunes

### 401 Unauthorized
- JWT ausente
- JWT expirado
- JWT inválido (tampering detectado)
- Sesión eliminada de BD (logout omnibus)

**Solución**: Hacer login de nuevo

### 403 Forbidden
- Usuario autenticado pero sin permiso requerido
- Rol no asignado

**Solución**: Solicitar permisos al administrador

### 400 Bad Request
- Email ya existe
- Validación fallida (email inválido, contraseña muy corta)
- Parámetros faltantes

**Solución**: Revisar error message y corregir datos

### 404 Not Found
- Usuario/rol/permiso no existe

**Solución**: Verificar ID es correcto

---

## Rate Limiting

`No configurado actualmente` pero recomendado para:
- POST /api/auth/[...nextauth] (login): máximo 5 intentos/minuto
- POST /api/auth/reset-password: máximo 3 intentos/minuto/email
- Endpoints de creación: máximo 100 requests/minuto por usuario

---

## Notas para Desarrolladores

1. **Siempre retornar errores genéricos en producción** - No exponer detalles internos
2. **Auditoría es crítica** - Registrar todas las operaciones para compliance
3. **Validación en cliente y servidor** - Cliente para UX, servidor para seguridad
4. **Transacciones atómicas** - Operaciones múltiples (ej: crear usuario + asignar rol) usar transacción
5. **Permiso requerido en cada ruta** - Revisar que `requirePermission()` está presente
6. **JWT expira cada 30 días** - Usuario debe re-login o refrescar token
7. **Sesiones múltiples por usuario** - Cada dispositivo/navegador = sesión nueva

