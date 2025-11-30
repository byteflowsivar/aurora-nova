# Plan de Migración a Next.js 16

**Proyecto**: Aurora Nova - Application Base
**Fecha de Creación**: 2025-11-29
**Rama de Trabajo**: `migracion-next-16`
**Versión Actual**: Next.js 15.5.6
**Versión Objetivo**: Next.js 16.x (latest stable)

---

## 📊 Resumen Ejecutivo

Esta migración actualiza la aplicación base de Aurora Nova desde Next.js 15.5.6 a Next.js 16.x. El proyecto ya tiene varios aspectos preparados para la migración (React 19, APIs asíncronas en routes, Turbopack), lo que facilita el proceso.

### Tiempo Estimado
- **Migración Automática (codemod)**: 10-15 minutos
- **Revisión y Ajustes Manuales**: 1-2 horas
- **Testing Completo**: 2-3 horas
- **Total**: 3-5 horas aproximadamente

### Riesgo
🟢 **Bajo-Medio**: El proyecto ya sigue muchas best practices de Next.js 16

---

## 📋 Estado Actual del Proyecto

### Versiones Actuales

| Dependencia | Versión Actual | Versión Objetivo | Estado |
|-------------|----------------|------------------|---------|
| next | 15.5.6 | 16.x (latest) | ⚠️ Actualizar |
| react | 19.1.0 | 19.1.0 | ✅ Correcto |
| react-dom | 19.1.0 | 19.1.0 | ✅ Correcto |
| next-auth | 5.0.0-beta.30 | Verificar latest beta | ⚠️ Revisar |
| @auth/prisma-adapter | 2.11.1 | Verificar latest | ⚠️ Revisar |

### ✅ Aspectos Ya Preparados

1. **React 19 Instalado**
   - El proyecto ya usa React 19.1.0
   - Compatible con Next.js 16

2. **APIs Asíncronas en Route Handlers**
   - Ya usa `params: Promise<{ id: string }>` correctamente
   - Ejemplo: `application-base/src/app/api/roles/[id]/route.ts:14`

3. **Server Actions con await**
   - Ya usa `await headers()` en server actions
   - Ejemplo: `application-base/src/actions/auth.ts:162`

4. **Layouts Asíncronos**
   - Layouts son `async` y usan `await auth()`
   - Ejemplo: `application-base/src/app/(protected)/layout.tsx:10`
   - Ejemplo: `application-base/src/app/layout.tsx:23`

5. **Turbopack Habilitado**
   - Ya configurado en `package.json`: `"dev": "next dev --turbopack"`

6. **TypeScript en Modo Estricto**
   - `strict: true` en `tsconfig.json`
   - Ayudará a detectar errores durante migración

### ⚠️ Áreas que Requieren Atención

#### 1. APIs Asíncronas Obligatorias
En Next.js 16, estas APIs **DEBEN** ser siempre `await`:
- `cookies()` - para leer/escribir cookies
- `headers()` - para leer headers
- `params` - en route handlers y pages
- `searchParams` - en pages

**Archivos a Revisar**:
- ✅ `src/actions/auth.ts` - Ya usa `await headers()`
- ✅ `src/app/api/**/*.ts` - Ya usa `await params`
- ⚠️ Buscar cualquier otro uso en el proyecto

#### 2. searchParams en Client Components
**Archivo**: `src/app/auth/reset-password/page.tsx`
- Ya usa `useSearchParams()` dentro de `<Suspense>` ✅
- Compatible con Next.js 16

#### 3. Dependencias Third-Party
Verificar compatibilidad con Next.js 16:
- **next-auth**: Versión beta, puede requerir actualización
- **@auth/prisma-adapter**: Verificar última versión compatible
- **Radix UI**: Verificar compatibilidad con React 19
- **@tanstack/react-table**: Verificar compatibilidad
- **Prisma**: Debería ser compatible

#### 4. Configuración
**Archivo**: `next.config.ts`
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};
```
- ✅ Ya usa configuración moderna
- ⚠️ Verificar si hay flags experimentales deprecados en Next.js 16

---

## 🗺️ Plan de Migración Paso a Paso

### Fase 1: Preparación ✅

#### Paso 1.1: Verificar Estado de Git
```bash
git status
```
**Criterio de Éxito**: Working directory limpio

#### Paso 1.2: Crear Backup (Opcional)
```bash
git tag backup-pre-nextjs16
```

---

### Fase 2: Migración Automática

#### Paso 2.1: Ejecutar Codemod de Next.js
```bash
cd application-base
npx @next/codemod upgrade latest
```

**Lo que hace el codemod**:
- ✅ Actualiza Next.js, React, React DOM automáticamente
- ✅ Convierte APIs síncronas a asíncronas (`params`, `searchParams`, `cookies`, `headers`)
- ✅ Actualiza configuración en `next.config.ts`
- ✅ Ajusta parallel routes y dynamic segments
- ✅ Maneja deprecaciones de Image defaults

**Requisitos**:
- Working directory limpio (Git)
- Node.js 18+ instalado
- npm/pnpm/yarn disponible

#### Paso 2.2: Revisar Cambios Generados
```bash
git diff
```

**Qué buscar**:
- Cambios en `package.json`
- Cambios en `next.config.ts`
- Cambios en route handlers (await params)
- Cambios en pages (await searchParams)
- Cambios en server actions (await cookies/headers)

**Acción**: Revisar cada cambio y asegurar que tiene sentido

---

### Fase 3: Ajustes Manuales

#### Paso 3.1: Actualizar next-auth
```bash
# Verificar última versión compatible
npm info next-auth versions
```

**Acciones**:
1. Revisar changelog de next-auth
2. Actualizar a última versión beta compatible con Next.js 16
3. Verificar breaking changes

**Archivos a Revisar**:
- `src/lib/auth.ts` - Configuración de next-auth
- `src/actions/auth.ts` - Server actions de autenticación
- `src/components/providers/session-provider.tsx` - SessionProvider

#### Paso 3.2: Verificar next.config.ts
```bash
# Revisar documentación de Next.js 16
# https://nextjs.org/docs/app/api-reference/config/next-config-js
```

**Verificar**:
- `serverExternalPackages`: Sigue siendo válido
- `output: 'standalone'`: Sigue siendo válido
- Flags experimentales deprecados

#### Paso 3.3: Auditar APIs Asíncronas Manualmente

**Buscar usos de cookies():**
```bash
grep -r "cookies()" src --include="*.ts" --include="*.tsx"
```

**Buscar usos de headers():**
```bash
grep -r "headers()" src --include="*.ts" --include="*.tsx"
```

**Buscar params sin Promise:**
```bash
grep -r "{ params }" src/app/api --include="*.ts" | grep -v "Promise"
```

**Acción**: Asegurar que todos usan `await`

#### Paso 3.4: Actualizar Dependencias Third-Party
```bash
npm outdated
```

**Actualizar selectivamente**:
```bash
npm update @auth/prisma-adapter
npm update @radix-ui/react-dialog
npm update @radix-ui/react-dropdown-menu
# ... etc
```

**Criterio**: Solo actualizar si es necesario para compatibilidad

---

### Fase 4: Testing y Validación

#### Paso 4.1: Instalar Dependencias
```bash
npm install
```

**Criterio de Éxito**: Sin errores de instalación

#### Paso 4.2: Build del Proyecto
```bash
npm run build
```

**Qué buscar**:
- ❌ Errores de TypeScript
- ⚠️ Warnings de deprecación
- ⚠️ Warnings de optimización

**Acción**: Corregir todos los errores, documentar warnings

**Errores Comunes**:
- Tipos incorrectos de `params`/`searchParams`
- Propiedades deprecadas en componentes
- Conflictos de versiones en tipos

#### Paso 4.3: Iniciar Servidor de Desarrollo
```bash
npm run dev
```

**Verificar**:
- ✅ Servidor inicia sin errores
- ✅ Turbopack funciona correctamente
- ✅ Hot reload funciona

#### Paso 4.4: Testing Manual - Rutas Públicas

**Rutas a Probar**:
1. `/` - Home page
2. `/auth/signin` - Login page
3. `/auth/forgot-password` - Recuperación de contraseña
4. `/auth/reset-password?token=test` - Reset password (con token)

**Verificar**:
- ✅ Páginas cargan correctamente
- ✅ Formularios renderizan
- ✅ No hay errores en consola del navegador
- ✅ Suspense boundaries funcionan

#### Paso 4.5: Testing Manual - Autenticación

**Flujo de Login**:
1. Ir a `/auth/signin`
2. Ingresar credenciales válidas
3. Verificar redirección a `/dashboard`
4. Verificar sesión creada en BD (tabla `session`)
5. Verificar JWT en cookies

**Flujo de Logout**:
1. Click en botón de logout
2. Verificar sesión eliminada de BD
3. Verificar redirección a `/auth/signin`
4. Verificar JWT eliminado

**Sistema Híbrido JWT + Database**:
- ✅ Sesión se crea en tabla `session` con IP y UserAgent
- ✅ JWT contiene `sessionToken`
- ✅ Logout elimina registro de BD

**Archivo Crítico**: `src/lib/auth.ts` - Callbacks de JWT

#### Paso 4.6: Testing Manual - Rutas Protegidas

**Rutas a Probar**:
1. `/dashboard` - Dashboard principal
2. `/users` - Gestión de usuarios
3. `/roles` - Gestión de roles
4. `/permissions` - Gestión de permisos
5. `/settings` - Configuración

**Verificar**:
- ✅ Requieren autenticación (redirect a `/auth/signin` si no autenticado)
- ✅ Sidebar renderiza correctamente
- ✅ Menú dinámico carga correctamente (`getMenuServer()`)
- ✅ Breadcrumbs funcionan

**Archivo Crítico**: `src/app/(protected)/layout.tsx`

#### Paso 4.7: Testing Manual - API Routes

**Endpoints a Probar**:

**Users**:
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/[id]` - Obtener usuario
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Eliminar usuario

**Roles**:
- `GET /api/roles` - Listar roles
- `POST /api/roles` - Crear rol
- `GET /api/roles/[id]` - Obtener rol
- `PUT /api/roles/[id]` - Actualizar rol
- `DELETE /api/roles/[id]` - Eliminar rol

**Permissions**:
- `GET /api/permissions` - Listar permisos
- `POST /api/roles/[id]/permissions` - Asignar permisos a rol
- `GET /api/users/[id]/permissions` - Obtener permisos de usuario

**Verificar**:
- ✅ `await params` funciona correctamente
- ✅ Respuestas JSON correctas
- ✅ Códigos de estado HTTP correctos
- ✅ Autenticación/autorización funciona
- ✅ Validación de datos (Zod) funciona

**Herramientas**:
- Postman, Insomnia, o `curl`
- Browser DevTools (Network tab)

#### Paso 4.8: Testing Manual - CRUD Completo

**Usuarios**:
1. Crear usuario nuevo
2. Listar usuarios
3. Editar usuario
4. Asignar roles a usuario
5. Eliminar usuario

**Roles**:
1. Crear rol nuevo
2. Listar roles
3. Editar rol
4. Asignar permisos a rol
5. Eliminar rol

**Verificar**:
- ✅ Formularios funcionan
- ✅ Validaciones client-side funcionan
- ✅ Mensajes de error/éxito (toast) funcionan
- ✅ Tablas actualizan datos
- ✅ Diálogos abren/cierran correctamente

#### Paso 4.9: Testing Manual - Recuperación de Contraseña

**Flujo Completo**:
1. Ir a `/auth/forgot-password`
2. Ingresar email válido
3. Verificar email enviado (check logs o mock server)
4. Obtener token del email
5. Ir a `/auth/reset-password?token=<TOKEN>`
6. Verificar validación de token
7. Ingresar nueva contraseña
8. Verificar contraseña actualizada
9. Login con nueva contraseña

**Verificar**:
- ✅ Token se crea en BD (tabla `passwordResetToken`)
- ✅ Email se envía con template Mustache
- ✅ Token expira después de 30 minutos
- ✅ Token se elimina después de usar

**Archivos Críticos**:
- `src/actions/auth.ts` - `requestPasswordReset`, `validatePasswordResetToken`
- `src/app/api/auth/reset-password/route.ts`
- `src/lib/email/templates/password-reset.mustache`

#### Paso 4.10: Testing Automatizado - Suite de Pruebas
```bash
npm run test:run
```

**Qué buscar**:
- ❌ Tests fallidos
- ⚠️ Tests con warnings
- ⚠️ Snapshots desactualizados

**Acción**: Corregir tests fallidos

**Archivos a Revisar**:
- Tests que usan `headers()`, `cookies()`, `params`
- Tests que mockean Next.js APIs
- Tests de componentes con `useSearchParams()`

**Actualizar Mocks**:
```typescript
// Ejemplo: Mock de headers() ahora debe retornar Promise
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => new Headers()),
  cookies: jest.fn(async () => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));
```

#### Paso 4.11: Coverage de Tests
```bash
npm run test:coverage
```

**Verificar**:
- Coverage no ha bajado significativamente
- Nuevos cambios están cubiertos

---

### Fase 5: Optimización y Documentación

#### Paso 5.1: Linter
```bash
npm run lint
```

**Acción**: Corregir warnings de ESLint

#### Paso 5.2: Verificar Warnings del Build
```bash
npm run build 2>&1 | grep -i "warn"
```

**Documentar**:
- Warnings que no se pueden corregir
- Deprecaciones a resolver en futuro

#### Paso 5.3: Actualizar Documentación

**Archivos a Actualizar**:
- `README.md` - Actualizar versión de Next.js
- `package.json` - Ya actualizado por codemod
- `CLAUDE.md` - Agregar notas de Next.js 16 si aplica
- `development_guide.md` - Actualizar instrucciones si cambiaron

**Crear**:
- `CHANGELOG.md` - Documentar cambios de la migración

#### Paso 5.4: Crear CHANGELOG Entry
```markdown
## [Unreleased]

### Changed
- Migrado de Next.js 15.5.6 a Next.js 16.x
- Actualizado React a 19.1.0
- Actualizado next-auth a [versión]
- Convertidas todas las APIs a asíncronas (params, searchParams, cookies, headers)

### Fixed
- [Listar issues corregidos durante migración]

### Breaking Changes
- [Listar breaking changes si hay]
```

---

## 🚨 Puntos Críticos a Vigilar

### 1. Sistema Híbrido JWT + Database
**Archivo**: `src/lib/auth.ts`

**Sistema Personalizado**:
- Login crea JWT + registro en tabla `session`
- JWT contiene `sessionToken` para vincular con BD
- Logout elimina registro de tabla `session`

**Callbacks Críticos**:
```typescript
async jwt({ token, user }) {
  // En primer login, crear sesión en BD
  if (user && user.id) {
    const sessionToken = generateSessionToken()
    await createSession({ sessionToken, userId: user.id, ... })
    token.sessionToken = sessionToken
  }
  return token
}

async session({ session, token }) {
  // Pasar sessionToken a la sesión
  session.sessionToken = token.sessionToken
  return session
}
```

**Verificar**:
- ✅ Callbacks siguen funcionando en Next.js 16
- ✅ `createSession()` crea registro en BD
- ✅ `deleteSession()` elimina registro correctamente
- ✅ IP y UserAgent se capturan desde `headers()`

### 2. Server Actions con headers()
**Archivo**: `src/actions/auth.ts:162`

```typescript
const headersList = await headers()
const ipAddress = headersList.get("x-forwarded-for") || "unknown"
const userAgent = headersList.get("user-agent") || "unknown"
```

**Verificar**:
- ✅ `await headers()` funciona en server actions
- ✅ Headers se pasan correctamente a `signIn()`
- ✅ IP y UserAgent se guardan en sesión

### 3. Rutas Protegidas
**Archivo**: `src/app/(protected)/layout.tsx:10`

```typescript
export default async function ProtectedLayout({ children }) {
  const session = await auth()
  if (!session?.user) {
    redirect("/auth/signin")
  }
  // ...
}
```

**Verificar**:
- ✅ `await auth()` funciona correctamente
- ✅ Redirección funciona si no autenticado
- ✅ Menú dinámico carga (`await getMenuServer()`)

### 4. Email con Mustache
**Archivos**:
- `src/actions/auth.ts:318` - `requestPasswordReset()`
- `src/lib/email/templates/password-reset.mustache`

```typescript
const template = await fs.readFile(templatePath, 'utf8');
const emailHtml = Mustache.render(template, { resetLink });
await sendEmail({ to: email, subject: '...', html: emailHtml });
```

**Verificar**:
- ✅ Template se lee correctamente
- ✅ Mustache renderiza correctamente
- ✅ Email se envía (verificar en logs o mock server)

### 5. Prisma con serverExternalPackages
**Archivo**: `next.config.ts`

```typescript
serverExternalPackages: ['@prisma/client', 'bcryptjs']
```

**Verificar**:
- ✅ Prisma funciona en producción (build)
- ✅ No hay errores de bundling
- ✅ Bcryptjs funciona correctamente

---

## 🔧 Herramientas y Recursos

### Codemod Oficial de Next.js
```bash
npx @next/codemod upgrade latest
```

**Documentación**: https://nextjs.org/docs/app/building-your-application/upgrading/codemods

### Guía de Migración Next.js 16
- https://nextjs.org/docs/app/building-your-application/upgrading
- https://nextjs.org/blog/next-16

### Changelog de next-auth
- https://github.com/nextauthjs/next-auth/releases

### Herramientas de Testing
- Vitest: Testing framework ya configurado
- Browser DevTools: Para inspeccionar requests/responses
- Postman/Insomnia: Para testing de API routes

---

## 📊 Checklist de Validación

### Pre-Migración
- [ ] Git working directory limpio
- [ ] Rama `migracion-next-16` creada
- [ ] Backup creado (git tag)
- [ ] Dependencias actuales documentadas

### Migración
- [ ] Codemod ejecutado exitosamente
- [ ] Cambios revisados con `git diff`
- [ ] `package.json` actualizado
- [ ] `next.config.ts` revisado
- [ ] next-auth actualizado
- [ ] Dependencias third-party actualizadas

### Build y Desarrollo
- [ ] `npm install` sin errores
- [ ] `npm run build` exitoso
- [ ] `npm run dev` inicia correctamente
- [ ] Turbopack funciona
- [ ] Hot reload funciona

### Testing Manual - Autenticación
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Sesión se crea en BD
- [ ] JWT contiene sessionToken
- [ ] Logout elimina sesión de BD
- [ ] Redirección a rutas protegidas funciona

### Testing Manual - Rutas Públicas
- [ ] `/` carga correctamente
- [ ] `/auth/signin` carga correctamente
- [ ] `/auth/forgot-password` funciona
- [ ] `/auth/reset-password` valida token

### Testing Manual - Rutas Protegidas
- [ ] `/dashboard` requiere autenticación
- [ ] Sidebar renderiza
- [ ] Menú dinámico carga
- [ ] Breadcrumbs funcionan
- [ ] `/users` funciona
- [ ] `/roles` funciona
- [ ] `/permissions` funciona
- [ ] `/settings` funciona

### Testing Manual - API Routes
- [ ] `GET /api/users` funciona
- [ ] `POST /api/users` funciona
- [ ] `GET /api/users/[id]` funciona (await params)
- [ ] `PUT /api/users/[id]` funciona
- [ ] `DELETE /api/users/[id]` funciona
- [ ] `GET /api/roles` funciona
- [ ] `POST /api/roles` funciona
- [ ] `GET /api/roles/[id]` funciona (await params)
- [ ] `PUT /api/roles/[id]` funciona
- [ ] `DELETE /api/roles/[id]` funciona
- [ ] `GET /api/permissions` funciona
- [ ] Autenticación en API routes funciona

### Testing Manual - CRUD
- [ ] Crear usuario funciona
- [ ] Editar usuario funciona
- [ ] Eliminar usuario funciona
- [ ] Asignar roles a usuario funciona
- [ ] Crear rol funciona
- [ ] Editar rol funciona
- [ ] Eliminar rol funciona
- [ ] Asignar permisos a rol funciona

### Testing Manual - Recuperación de Contraseña
- [ ] Solicitar reset funciona
- [ ] Email se envía
- [ ] Token se crea en BD
- [ ] Validación de token funciona
- [ ] Reset de contraseña funciona
- [ ] Token expira correctamente
- [ ] Login con nueva contraseña funciona

### Testing Automatizado
- [ ] `npm run test:run` pasa
- [ ] Coverage no ha bajado
- [ ] Tests de API routes actualizados
- [ ] Tests de server actions actualizados
- [ ] Mocks de Next.js actualizados

### Linting y Warnings
- [ ] `npm run lint` sin errores
- [ ] Build warnings documentados
- [ ] Deprecaciones documentadas

### Documentación
- [ ] README actualizado
- [ ] CHANGELOG creado/actualizado
- [ ] Notas de migración documentadas
- [ ] Issues conocidos documentados

### Git y Deploy
- [ ] Cambios commiteados
- [ ] Commit message descriptivo
- [ ] PR creado
- [ ] Tests de CI pasando (si aplica)

---

## ⚠️ Problemas Conocidos y Soluciones

### Problema 1: Errores de Tipos con `params`
**Síntoma**: TypeScript error: `Type 'Promise<{ id: string }>' is not assignable to type '{ id: string }'`

**Solución**:
```typescript
// ❌ Antes (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
}

// ✅ Después (Next.js 16)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### Problema 2: Errores con `headers()` o `cookies()`
**Síntoma**: Error en runtime: `headers/cookies is not a function`

**Solución**: Asegurar que se llama con `await`
```typescript
// ❌ Antes
const headersList = headers()

// ✅ Después
const headersList = await headers()
```

### Problema 3: next-auth no Funciona
**Síntoma**: Errores en callbacks de JWT o sesión

**Soluciones Posibles**:
1. Actualizar a última versión beta compatible
2. Revisar changelog de breaking changes
3. Verificar que callbacks siguen la firma correcta
4. Verificar compatibilidad de `@auth/prisma-adapter`

**Recursos**:
- https://authjs.dev/getting-started/migrating-to-v5
- https://github.com/nextauthjs/next-auth/discussions

### Problema 4: Build Falla con Prisma
**Síntoma**: Error al hacer build: `Cannot find module '@prisma/client'`

**Solución**: Verificar `serverExternalPackages` en `next.config.ts`
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};
```

### Problema 5: Tests Fallan con Mocks de Next.js
**Síntoma**: Tests fallan por APIs asíncronas

**Solución**: Actualizar mocks en `vitest.setup.ts`
```typescript
// Mock de headers
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));
```

---

## 🎯 Criterios de Éxito

La migración se considera **exitosa** cuando:

1. ✅ Build pasa sin errores
2. ✅ Servidor de desarrollo inicia correctamente
3. ✅ Todas las rutas cargan sin errores
4. ✅ Autenticación (login/logout) funciona completamente
5. ✅ Sistema híbrido JWT + Database funciona
6. ✅ Todos los CRUD (users, roles, permissions) funcionan
7. ✅ Recuperación de contraseña funciona end-to-end
8. ✅ Suite de tests pasa
9. ✅ No hay warnings críticos
10. ✅ Documentación actualizada

---

## 📝 Notas de Implementación

### Decisiones Técnicas

1. **Usar Codemod Primero**: Automatizar lo más posible
2. **Revisión Manual Obligatoria**: No confiar ciegamente en codemod
3. **Testing Incremental**: Probar cada área después de cambios
4. **Documentar Todo**: Anotar problemas y soluciones

### Próximos Pasos Después de Migración

1. **Explorar Cache Components** (Next.js 16 feature)
   - Posible optimización para `getMenuServer()`
   - Caching de queries de Prisma

2. **Revisar Server Actions Performance**
   - Verificar tiempos de respuesta
   - Optimizar queries pesadas

3. **Actualizar Dependencias Regularmente**
   - Establecer proceso de actualización mensual
   - Monitorear breaking changes

---

## 📞 Contacto y Soporte

Si encuentras problemas durante la migración:

1. **Revisar este documento** - Problemas Conocidos y Soluciones
2. **Revisar documentación oficial de Next.js 16**
3. **Revisar GitHub Issues de next-auth**
4. **Documentar nuevos problemas** en este archivo

---

**Última Actualización**: 2025-11-29
**Autor**: Claude Code (AI Assistant)
**Revisado por**: [Pendiente]
