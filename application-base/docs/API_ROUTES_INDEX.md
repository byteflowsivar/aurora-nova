# API Routes Index - Aurora Nova

Índice de navegación rápida para todas las rutas API documentadas. Cada ruta apunta a su ubicación en el código y al documento de referencia.

## 📂 Estructura de Documentación

```
src/app/api/
├── auth/                          # Autenticación
│   ├── [...nextauth]/route.ts     # NextAuth (login, logout, callbacks)
│   ├── reset-password/route.ts    # POST resetear contraseña
│   └── validate-reset-token/      # GET validar token reset
│
├── admin/                          # Admin Routes (requieren user:* permisos)
│   ├── users/
│   │   ├── route.ts               # GET/POST listar y crear usuarios
│   │   └── [id]/
│   │       ├── route.ts           # GET/PATCH/DELETE usuario
│   │       ├── roles/route.ts      # GET/POST/DELETE asignar roles
│   │       └── permissions/        # GET permisos efectivos del usuario
│   │
│   ├── roles/
│   │   ├── route.ts               # GET/POST listar y crear roles
│   │   └── [id]/
│   │       ├── route.ts           # GET/PATCH/DELETE rol
│   │       └── permissions/        # POST/DELETE asignar permisos a rol
│   │
│   ├── permissions/route.ts        # GET listar permisos disponibles
│   │
│   ├── menu/
│   │   ├── route.ts               # GET/POST listar y crear items de menú
│   │   ├── [id]/route.ts          # GET/PATCH/DELETE item de menú
│   │   └── reorder/route.ts        # POST reordenar items de menú
│   │
│   └── audit/route.ts             # GET logs de auditoría con filtros
│
├── customer/                       # Customer Routes (usuario autenticado)
│   ├── profile/route.ts           # GET/PATCH perfil del usuario
│   ├── change-password/route.ts   # POST cambiar contraseña
│   └── menu/route.ts              # GET menú filtrado por permisos
│
└── public/                         # Public Routes (sin autenticación)
    └── health/route.ts            # GET health check
```

---

## 🔐 Rutas de Autenticación (`/api/auth`)

### POST /api/auth/[...nextauth]

**Función**: Manejo de autenticación NextAuth (login, logout, callbacks)

**Ubicación**: `src/app/api/auth/[...nextauth]/route.ts`

**Nivel de Documentación**:
- ✅ Configuración centralizada en `src/lib/auth/auth.ts`
- ⏳ JSDoc en route.ts (TODO: Sesión 12)

**Referencia**: Ver [API_REFERENCE.md#autenticación](./API_REFERENCE.md#autenticación-auth)

---

### POST /api/auth/reset-password

**Función**: Reiniciar contraseña usando token de reset

**Ubicación**: `src/app/api/auth/reset-password/route.ts`

**Nivel de Documentación**:
- ✅ JSDoc completo (134 líneas)
- ✅ Flujos de datos explicados
- ✅ Seguridad documentada
- ✅ Ejemplos prácticos

**Qué aprenderás**:
- Validación de tokens con SHA-256
- Bcryptjs para hash de contraseña
- Transacciones atómicas en Prisma
- Invalidación de sesiones
- Auditoría integrada

**Referencia**: Ver [API_REFERENCE.md#post-apiauthresetpassword](./API_REFERENCE.md#post-apiauthresetpassword)

---

### GET /api/auth/validate-reset-token

**Función**: Validar token de reset ANTES de mostrar formulario

**Ubicación**: `src/app/api/auth/validate-reset-token/route.ts`

**Nivel de Documentación**:
- ✅ JSDoc completo (133 líneas)
- ✅ Dos flujos de validación explicados
- ✅ UX vs seguridad trade-offs
- ✅ Ejemplos React prácticos

**Qué aprenderás**:
- Query parameters en NextRoute
- Validación de tokens antes de actuar
- UX pattern: validación previa
- Flujo completo email → reset
- Consideraciones de seguridad

**Referencia**: Ver [API_REFERENCE.md#get-apiauthvalidateresetttoken](./API_REFERENCE.md#get-apiauthvalidate-reset-token)

---

## 👥 Admin Routes - Usuarios (`/api/admin/users`)

### GET /api/admin/users

**Función**: Listar todos los usuarios del sistema

**Ubicación**: `src/app/api/admin/users/route.ts` (línea 34)

**Nivel de Documentación**:
- ✅ JSDoc completo (65 líneas)
- ✅ JSON schema de respuesta
- ✅ Performance notes
- ✅ Ejemplo de uso

**Permiso Requerido**: `user:list`

**Qué aprenderás**:
- Queries optimizadas en Prisma
- Select específico vs N+1
- Transformación de datos (roles nested)
- Ordenamiento (createdAt DESC)
- Error handling (401, 403, 500)

**Referencia**: Ver [API_REFERENCE.md#get-apiadminusers](./API_REFERENCE.md#get-apiadminusers)

---

### POST /api/admin/users

**Función**: Crear nuevo usuario

**Ubicación**: `src/app/api/admin/users/route.ts` (línea 100)

**Nivel de Documentación**:
- ✅ JSDoc completo (104 líneas)
- ✅ Body esperado con validaciones
- ✅ Estructura de respuesta
- ✅ Seguridad: bcryptjs, índice único
- ✅ Auditoría documentada
- ✅ Paso a paso: crear + asignar roles

**Permiso Requerido**: `user:create`

**Qué aprenderás**:
- Validación con Zod schemas
- Bcryptjs con salt 10
- Errores específicos (email exists, validación)
- Transacciones: user + credentials
- Eventos de auditoría
- Efectos secundarios

**Referencia**: Ver [API_REFERENCE.md#post-apiadminusers](./API_REFERENCE.md#post-apiadminusers)

---

### GET /api/admin/users/[id]

**Función**: Obtener detalles de usuario específico

**Ubicación**: `src/app/api/admin/users/[id]/route.ts`

**Nivel de Documentación**:
- ⏳ JSDoc básico (TODO: mejorar - Sesión 12)

**Permiso Requerido**: `user:read`

**Referencia**: Ver [API_REFERENCE.md#get-apiadminusersid](./API_REFERENCE.md#get-apiadminusersid)

---

### PATCH /api/admin/users/[id]

**Función**: Actualizar información del usuario

**Ubicación**: `src/app/api/admin/users/[id]/route.ts`

**Nivel de Documentación**:
- ⏳ JSDoc básico (TODO: mejorar - Sesión 12)

**Permiso Requerido**: `user:update`

**Referencia**: Ver [API_REFERENCE.md#patch-apiadminusersid](./API_REFERENCE.md#patch-apiadminusersid)

---

### DELETE /api/admin/users/[id]

**Función**: Eliminar usuario del sistema

**Ubicación**: `src/app/api/admin/users/[id]/route.ts`

**Nivel de Documentación**:
- ⏳ JSDoc básico (TODO: mejorar - Sesión 12)

**Permiso Requerido**: `user:delete`

**Efectos Secundarios**:
- Elimina sesiones
- Elimina asignaciones de rol
- Registra en auditoría

**Referencia**: Ver [API_REFERENCE.md#delete-apiadminusersid](./API_REFERENCE.md#delete-apiadminusersid)

---

### GET /api/admin/users/[id]/roles

**Función**: Listar roles asignados a usuario

**Ubicación**: `src/app/api/admin/users/[id]/roles/route.ts`

**Nivel de Documentación**:
- ⏳ JSDoc básico (TODO: mejorar - Sesión 12)

**Permiso Requerido**: `role:read`

**Referencia**: Ver [API_REFERENCE.md#get-apiadminusersid roles](./API_REFERENCE.md#get-apiadminusersid-roles)

---

### POST /api/admin/users/[id]/roles

**Función**: Asignar rol a usuario

**Ubicación**: `src/app/api/admin/users/[id]/roles/route.ts`

**Nivel de Documentación**:
- ⏳ JSDoc básico (TODO: mejorar - Sesión 12)

**Permiso Requerido**: `role:assign`

**Auditoría**: Se registra `ROLE_ASSIGNED`

**Referencia**: Ver [API_REFERENCE.md#post-apiadminusersid-roles](./API_REFERENCE.md#post-apiadminusersid-roles)

---

### GET /api/admin/users/[id]/permissions

**Función**: Listar permisos efectivos del usuario (de sus roles)

**Ubicación**: `src/app/api/admin/users/[id]/permissions/route.ts`

**Nivel de Documentación**:
- ⏳ JSDoc básico (TODO: mejorar - Sesión 12)

**Permiso Requerido**: `permission:read`

**Nota**: Permisos se calculan combinando todos los permisos de todos los roles

**Referencia**: Ver [API_REFERENCE.md#get-apiadminusersid-permissions](./API_REFERENCE.md#get-apiadminusersid-permissions)

---

## 👔 Admin Routes - Roles (`/api/admin/roles`)

### GET /api/admin/roles

**Función**: Listar todos los roles del sistema

**Ubicación**: `src/app/api/admin/roles/route.ts`

**Permiso Requerido**: `role:list`

**Referencia**: Ver [API_REFERENCE.md#get-apiadminroles](./API_REFERENCE.md#get-apiadminroles)

---

### POST /api/admin/roles

**Función**: Crear nuevo rol

**Ubicación**: `src/app/api/admin/roles/route.ts`

**Permiso Requerido**: `role:create`

**Auditoría**: Se registra `ROLE_CREATED`

**Referencia**: Ver [API_REFERENCE.md#post-apiadminroles](./API_REFERENCE.md#post-apiadminroles)

---

### GET /api/admin/roles/[id]

**Función**: Obtener detalles de rol específico

**Ubicación**: `src/app/api/admin/roles/[id]/route.ts`

**Permiso Requerido**: `role:read`

**Referencia**: Ver [API_REFERENCE.md#get-apiadminrolesid](./API_REFERENCE.md#get-apiadminrolesid)

---

### PATCH /api/admin/roles/[id]

**Función**: Actualizar rol

**Ubicación**: `src/app/api/admin/roles/[id]/route.ts`

**Permiso Requerido**: `role:update`

**Auditoría**: Se registra `ROLE_UPDATED`

**Referencia**: Ver [API_REFERENCE.md#patch-apiadminrolesid](./API_REFERENCE.md#patch-apiadminrolesid)

---

### DELETE /api/admin/roles/[id]

**Función**: Eliminar rol

**Ubicación**: `src/app/api/admin/roles/[id]/route.ts`

**Permiso Requerido**: `role:delete`

**Restricciones**:
- No se puede eliminar si usuarios lo tienen asignado
- No se pueden eliminar roles del sistema

**Auditoría**: Se registra `ROLE_DELETED`

**Referencia**: Ver [API_REFERENCE.md#delete-apiadminrolesid](./API_REFERENCE.md#delete-apiadminrolesid)

---

### POST /api/admin/roles/[id]/permissions

**Función**: Asignar permiso a rol

**Ubicación**: `src/app/api/admin/roles/[id]/permissions/route.ts`

**Permiso Requerido**: `permission:assign`

**Auditoría**: Se registra `PERMISSION_GRANTED`

**Referencia**: Ver [API_REFERENCE.md#post-apiadminrolesid-permissions](./API_REFERENCE.md#post-apiadminrolesid-permissions)

---

## 🔑 Admin Routes - Permisos (`/api/admin/permissions`)

### GET /api/admin/permissions

**Función**: Listar todos los permisos disponibles

**Ubicación**: `src/app/api/admin/permissions/route.ts`

**Permiso Requerido**: `permission:list`

**Nota**: Permisos están definidos en `src/modules/admin/types/permissions.ts` como constantes

**Referencia**: Ver [API_REFERENCE.md#get-apiadminpermissions](./API_REFERENCE.md#get-apiadminpermissions)

---

## 📋 Admin Routes - Menú (`/api/admin/menu`)

### GET /api/admin/menu

**Función**: Obtener estructura de menú dinámico (filtrado por permisos)

**Ubicación**: `src/app/api/admin/menu/route.ts`

**Autenticación**: Requerida

**Nota**: Solo retorna items para los cuales el usuario tiene permisos

**Referencia**: Ver [API_REFERENCE.md#get-apiadminmenu](./API_REFERENCE.md#get-apiadminmenu)

---

### POST /api/admin/menu

**Función**: Crear nuevo item de menú

**Ubicación**: `src/app/api/admin/menu/route.ts`

**Permiso Requerido**: `menu:create`

**Referencia**: Ver [API_REFERENCE.md#post-apiadminmenu](./API_REFERENCE.md#post-apiadminmenu)

---

### GET /api/admin/menu/[id]

**Función**: Obtener detalles de item de menú

**Ubicación**: `src/app/api/admin/menu/[id]/route.ts`

**Autenticación**: Requerida

**Referencia**: Ver [API_REFERENCE.md#get-apiadminmenuid](./API_REFERENCE.md#get-apiadminmenuid)

---

### PATCH /api/admin/menu/[id]

**Función**: Actualizar item de menú

**Ubicación**: `src/app/api/admin/menu/[id]/route.ts`

**Permiso Requerido**: `menu:update`

**Referencia**: Ver [API_REFERENCE.md#patch-apiadminmenuid](./API_REFERENCE.md#patch-apiadminmenuid)

---

### DELETE /api/admin/menu/[id]

**Función**: Eliminar item de menú

**Ubicación**: `src/app/api/admin/menu/[id]/route.ts`

**Permiso Requerido**: `menu:delete`

**Referencia**: Ver [API_REFERENCE.md#delete-apiadminmenuid](./API_REFERENCE.md#delete-apiadminmenuid)

---

### POST /api/admin/menu/reorder

**Función**: Reordenar items de menú

**Ubicación**: `src/app/api/admin/menu/reorder/route.ts`

**Permiso Requerido**: `menu:update`

**Referencia**: Ver [API_REFERENCE.md#post-apiadminmenureorder](./API_REFERENCE.md#post-apiadminmenureorder)

---

## 📊 Admin Routes - Auditoría (`/api/admin/audit`)

### GET /api/admin/audit

**Función**: Obtener registros de auditoría del sistema

**Ubicación**: `src/app/api/admin/audit/route.ts`

**Permiso Requerido**: `audit:read`

**Features**:
- Filtros por userId, action
- Paginación (limit, offset)
- Ordenamiento por timestamp DESC
- Cambios registrados por campo

**Referencia**: Ver [API_REFERENCE.md#get-apiadminaudit](./API_REFERENCE.md#get-apiadminaudit)

---

## 👤 Customer Routes (`/api/customer`)

### GET /api/customer/profile

**Función**: Obtener perfil del usuario autenticado

**Ubicación**: `src/app/api/customer/profile/route.ts`

**Autenticación**: Requerida

**Referencia**: Ver [API_REFERENCE.md#get-apicustomerprofile](./API_REFERENCE.md#get-apicustomerprofile)

---

### PATCH /api/customer/profile

**Función**: Actualizar perfil del usuario autenticado

**Ubicación**: `src/app/api/customer/profile/route.ts`

**Autenticación**: Requerida

**Auditoría**: Se registra `PROFILE_UPDATED`

**Referencia**: Ver [API_REFERENCE.md#patch-apicustomerprofile](./API_REFERENCE.md#patch-apicustomerprofile)

---

### POST /api/customer/change-password

**Función**: Cambiar contraseña del usuario autenticado

**Ubicación**: `src/app/api/customer/change-password/route.ts`

**Autenticación**: Requerida

**Auditoría**: Se registra `PASSWORD_CHANGED`

**Validaciones**:
- Current password correcta
- New password cumple reglas
- Confirm password coincide exactamente
- New password ≠ current password

**Referencia**: Ver [API_REFERENCE.md#post-apicustomerchange-password](./API_REFERENCE.md#post-apicustomerchange-password)

---

### GET /api/customer/menu

**Función**: Obtener menú filtrado por permisos del usuario

**Ubicación**: `src/app/api/customer/menu/route.ts`

**Autenticación**: Requerida

**Nota**: Usado para renderizar sidebar en cliente

**Referencia**: Ver [API_REFERENCE.md#get-apicustomermenu](./API_REFERENCE.md#get-apicustomermenu)

---

## 🏥 Public Routes (`/api/public`)

### GET /api/public/health

**Función**: Health check de la aplicación

**Ubicación**: `src/app/api/public/health/route.ts`

**Autenticación**: Pública

**Uso**: Verificar que API está disponible

**Referencia**: Ver [API_REFERENCE.md#get-apipublichealth](./API_REFERENCE.md#get-apipublichealth)

---

## 📝 Estado de Documentación

| Sección | Routes | JSDoc Completo | Notas |
|---------|--------|---|-------|
| Auth | 3 | ✅ 2/3 | reset-password, validate-token completos |
| Admin Users | 7 | ✅ 2/7 | GET, POST completos. Resto TODO |
| Admin Roles | 5 | ⏳ 0/5 | TODO: Sesión 12 |
| Admin Perms | 1 | ⏳ 0/1 | TODO: Sesión 12 |
| Admin Menu | 5 | ⏳ 0/5 | TODO: Sesión 12 |
| Admin Audit | 1 | ⏳ 0/1 | TODO: Sesión 12 |
| Customer | 3 | ⏳ 0/3 | TODO: Sesión 12 |
| Public | 1 | ⏳ 0/1 | TODO: Sesión 12 |
| **TOTAL** | **26** | **✅ 2** | **⏳ 24** |

---

## 🚀 Próximos Pasos (Sesión 12+)

### Prioridad Alta
1. **Admin Usuarios** (5 rutas): [id], [id]/roles, [id]/permissions
2. **Admin Roles** (5 rutas): CRUD + permissions
3. **Customer Routes** (3 rutas): profile, change-password, menu
4. **Admin Menú** (5 rutas): CRUD + reorder

### Prioridad Media
5. **Admin Permisos** (1 ruta)
6. **Admin Auditoría** (1 ruta)
7. **Public Health** (1 ruta)
8. **Auth NextAuth** (1 ruta)

---

## 📚 Referencias Cruzadas

- **API_REFERENCE.md**: Especificación completa de todos los endpoints
- **src/types/**: Type definitions documentadas
- **src/modules/*/types/**: Types específicos del módulo
- **src/lib/server/require-permission.ts**: Middleware de autorización
- **src/lib/auth/auth.ts**: Configuración de NextAuth

---

## 💡 Cómo Usar Este Índice

1. **Busca el endpoint** que necesitas en la sección correspondiente
2. **Abre el archivo .ts** para ver la implementación + JSDoc
3. **Consulta API_REFERENCE.md** para especificación completa
4. **Ver ejemplos** en las secciones de @example

---

**Última actualización**: Sesión 11
**Documentación**: 74b74db + 1219545
**Build Status**: ✅ Compilado correctamente
