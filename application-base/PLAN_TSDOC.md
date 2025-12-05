# Plan de Documentación TSDoc - Aurora Nova

**Objetivo**: Documentar todo el código fuente con TSDoc para IDE autocompletion

**Estado**: En progreso (sesión 1 completada)

---

## Sesión 1 - COMPLETADA ✅

### Archivos Documentados (lib/)

1. ✅ `src/lib/prisma/queries.ts` - 17 funciones (queries de usuario, rol, sesión, stats)
2. ✅ `src/lib/utils.ts` - Función cn() para clases Tailwind
3. ✅ `src/lib/rate-limiter.ts` - Rate limiting con LRU cache
4. ✅ `src/lib/config.ts` - Configuración global
5. ✅ `src/lib/logger.ts` - Pino logger wrapper
6. ✅ `src/lib/menu/menu-cache.ts` - Cache dinámico de menú
7. ✅ `src/lib/prisma/types.ts` - Definiciones de tipos Prisma

**Total**: 7 archivos documentados
**Commits**: 4 commits

---

## Sesión 2 - PLANIFICADO PARA MAÑANA

### Fase 1: Actions (Prioridad ALTA)
**Estimado**: 1-2 horas
**Impacto**: Alto (lógica principal de la aplicación)

- [ ] `src/actions/session-management.ts` - Gestión de sesiones
- [ ] `src/actions/auth.ts` - PARCIALMENTE (solo registerUser expandido, falta rest)
- [ ] Otros archivos en `src/actions/` si existen
  - Posibles: roles.ts, permissions.ts, users.ts, etc.

**Qué documentar**: @async, @param, @returns, @throws, @remarks (validaciones, flujos), @example

---

### Fase 2: API Routes Administrativas (Prioridad ALTA)
**Estimado**: 2-3 horas
**Impacto**: Alto (endpoints críticos)

**Grupo A**: Roles y Permisos
- [ ] `src/app/api/admin/roles/route.ts` - CRUD de roles (GET, POST)
- [ ] `src/app/api/admin/roles/[id]/route.ts` - Rol individual (GET, PUT, DELETE)
- [ ] `src/app/api/admin/permissions/route.ts` - CRUD de permisos
- [ ] `src/app/api/admin/permissions/[id]/route.ts` - Permiso individual

**Grupo B**: Usuarios y Audit
- [ ] `src/app/api/admin/users/route.ts` - CRUD de usuarios
- [ ] `src/app/api/admin/users/[id]/route.ts` - Usuario individual
- [ ] `src/app/api/admin/audit/route.ts` - Auditoría

**Grupo C**: Menú y otros
- [ ] `src/app/api/admin/menu/route.ts` - Menú dinámico
- [ ] `src/app/api/admin/*` - Otros endpoints si existen

**Qué documentar**: Endpoint details (method, route, auth), params, respuestas (200, 400, 401, 404, 500), flujos

---

### Fase 3: API Routes Públicas (Prioridad MEDIA)
**Estimado**: 1-2 horas
**Impacto**: Medio

- [ ] `/api/auth/register` - Registro (PARCIALMENTE documentado)
- [ ] `/api/auth/login` - Login
- [ ] `/api/auth/logout` - Logout
- [ ] `/api/auth/reset-password` - Reset password (YA DOCUMENTADO)
- [ ] Otros endpoints públicos

---

### Fase 4: Componentes React (Prioridad MEDIA)
**Estimado**: 3-4 horas
**Impacto**: Medio-Alto (muchos componentes)

- [ ] `src/components/` - Todos los .tsx files
  - Componentes de UI (Button, Card, Modal, etc)
  - Containers vs Presentational
  - Props documentation
  - Ejemplos de uso

---

### Fase 5: Hooks Custom (Prioridad MEDIA)
**Estimado**: 1 hora
**Impacto**: Medio

- [ ] `src/hooks/` - Si existen hooks custom
  - useAuth, useUser, useMenu, usePermission, etc.
  - Parámetros, return type, efectos

---

### Fase 6: Módulos (Prioridad MEDIA-ALTA)
**Estimado**: 3-4 horas
**Impacto**: Alto (lógica reutilizable)

**Módulo Shared** - Utilidades compartidas
- [ ] `src/modules/shared/components/` - Componentes comunes
- [ ] `src/modules/shared/utils/` - Funciones utilitarias
- [ ] `src/modules/shared/schemas/` - Validaciones Zod
- [ ] `src/modules/shared/types/` - Tipos compartidos
- [ ] `src/modules/shared/hooks/` - Hooks compartidos

**Módulo Admin** - Funcionalidad administrativa
- [ ] `src/modules/admin/components/` - Componentes admin
- [ ] `src/modules/admin/services/` - Servicios (queries BD, lógica)
- [ ] `src/modules/admin/types/` - Tipos admin específicos
- [ ] `src/modules/admin/utils/` - Utilidades admin

**Módulo Public** - Área pública
- [ ] `src/modules/public/components/` - Componentes públicos
- [ ] `src/modules/public/services/` - Servicios públicos
- [ ] `src/modules/public/types/` - Tipos públicos

---

## Priorización Recomendada

### Sesión 2 (Mañana)
1. **Actions** (Fase 1) - Rápido, alto impacto
2. **API Routes Admin** (Fase 2) - Crítico, muchos endpoints
3. **Si tiempo sobra**: Empezar Fase 3 (API públicas)

### Sesiones Futuras
4. **Componentes React** (Fase 4) - Volumen grande
5. **Hooks** (Fase 5) - Rápido
6. **Módulos** (Fase 6) - Volumen grande, pero reutilizable

---

## Patrones a Seguir

### Para Actions:
```typescript
/**
 * Descripción corta
 *
 * Descripción larga con contexto y flujo
 *
 * @async
 * @param {type} name - Descripción del parámetro
 * @returns {Promise<type>} Qué retorna
 * @throws {ErrorType} Cuándo falla
 *
 * @remarks
 * **Validaciones**: Qué se valida
 * **Flujo**: Pasos del proceso
 * **Seguridad**: Notas de seguridad si aplica
 *
 * @example
 * ```typescript
 * // Cómo usar
 * const result = await myAction(params);
 * ```
 */
```

### Para API Routes:
```typescript
/**
 * API Route: [METHOD] /path
 *
 * Descripción
 *
 * **Endpoint Details**:
 * - Method: POST
 * - Route: /api/admin/users
 * - Auth: Requiere admin
 * - Content-Type: application/json
 *
 * **Parámetros**:
 * - (body)
 * - (query)
 * - (path)
 *
 * **Respuestas**:
 * - 200: Success
 * - 400: Validation error
 * - 401: Unauthorized
 * - 404: Not found
 * - 500: Server error
 *
 * **Flujo**:
 * 1. Validar
 * 2. Autorizar
 * 3. Procesar
 * 4. Retornar
 *
 * @see {@link ../../actions/users.ts} para lógica
 */
```

### Para Componentes:
```typescript
/**
 * Componente Button
 *
 * Botón reutilizable con variantes
 *
 * @component
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * ```
 *
 * @param {ButtonProps} props
 * @param {string} [props.variant] - Variante (primary, secondary, danger)
 * @param {string} [props.size] - Tamaño (sm, md, lg)
 * @param {ReactNode} props.children - Contenido del botón
 * @returns {JSX.Element}
 */
```

---

## Commits Esperados Sesión 2

- `docs(actions): Documentar actions con TSDoc`
- `docs(api/admin): Documentar API routes administrativas`
- `docs(api/public): Documentar API routes públicas`
- `docs(components): Documentar componentes React` (si entra)

---

## Notas Importantes

1. **Type Safety**: Todos los tipos deben estar completos (no `any`)
2. **Examples**: Siempre incluir al menos un ejemplo de uso
3. **Cross-references**: Usar @see para linking entre archivos
4. **Security**: Notar validaciones, autorización, edge cases
5. **Performance**: Mencionar si hay operaciones costosas
6. **IDE Support**: Goal es tener autocompletion completo

---

## Checklist Final

- [ ] Todos los archivos lib/ documentados ✅ (Sesión 1)
- [ ] Todos los actions documentados (Sesión 2)
- [ ] Todos los API routes documentados (Sesión 2-3)
- [ ] Todos los componentes documentados (Sesión 3-4)
- [ ] Todos los hooks documentados (Sesión 4)
- [ ] Todos los módulos documentados (Sesión 4-5)
- [ ] Build sin errores
- [ ] Git history limpio con commits por sección

---

**Última actualización**: Sesión 1 completada
**Próxima sesión**: Mañana (Fases 1-2)
