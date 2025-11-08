# Convenciones de Desarrollo

Este documento define las convenciones y estándares a seguir durante el desarrollo de Aurora Nova.

## 1. Código

- **Estilo de Código:** El proyecto utiliza ESLint para forzar un estilo de código consistente. Antes de hacer commit, ejecuta `npm run lint` para verificar que no haya errores.
- **Principios SOLID:** El código debe adherirse a los principios SOLID para asegurar que sea comprensible, mantenible y escalable.
- **Tipado:** El proyecto utiliza TypeScript. Se debe priorizar un tipado estricto y explícito.

## 2. Commits

*(Actualmente no hay una convención definida, pero se recomienda seguir el estándar de Conventional Commits)*

**Formato:** `<tipo>(<ámbito>): <descripción>`

- **Tipos comunes:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- **Ejemplo:** `feat(auth): agregar login con Google`

## 3. Nomenclatura de Permisos

Los permisos deben seguir el formato `módulo:acción`.

- **Ejemplos:** `user:create`, `role:delete`, `system:admin`.

## 4. Estructura de Archivos

- **Componentes:** `src/components/`
  - `ui/`: Componentes de UI genéricos (de shadcn/ui).
  - `layout/`: Componentes de estructura de la página (Sidebar, Header).
  - `auth/`: Componentes relacionados con autenticación.
  - `profile/`: Componentes para la página de perfil.
- **APIs:** `src/app/api/`
- **Librerías y Lógica Core:** `src/lib/`
- **Tests:** `src/__tests__/`
