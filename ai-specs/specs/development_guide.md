# Guía de Desarrollo para Aurora Nova

Sistema de autenticación y autorización basado en roles (RBAC) construido con Next.js 15, PostgreSQL 18 y Auth.js.

---

## 🚀 Instrucciones de Configuración

### Prerrequisitos

Asegúrate de tener instalado lo siguiente:
- **Node.js** (v20 o superior)
- **npm** (v9 o superior)
- **Docker** y **Docker Compose** (para la base de datos PostgreSQL)
- **Git**
- **PostgreSQL 18+** (incluido en el contenedor Docker)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/byteflowsivar/aurora-nova.git
cd aurora-nova
```

### 2. Configuración de la Base de Datos

#### Usando Docker (Recomendado)

El proyecto incluye un archivo `docker-compose.yml` con dos servicios de PostgreSQL:
- **db**: Base de datos principal para desarrollo (puerto 5432)
- **test-db**: Base de datos para pruebas (puerto 5433)

```bash
# Iniciar los contenedores de base de datos en segundo plano
docker-compose up -d

# Verificar que los contenedores estén corriendo
docker ps

# Deberías ver:
# - aurora-nova-db (PostgreSQL 18 en puerto 5432)
# - aurora-nova-test-db (PostgreSQL 18 en puerto 5433)
```

La base de datos estará disponible con las siguientes credenciales (definidas en `docker-compose.yml`):
- **Usuario**: aurora_user
- **Contraseña**: changeme_in_production
- **Base de datos**: aurora_nova_db
- **Puerto**: 5432

**ADVERTENCIA**: Estas credenciales son solo para desarrollo. En producción, usar un sistema de gestión de secretos.

### 3. Configuración del Entorno

Navega al directorio de la aplicación y crea el archivo de variables de entorno:

```bash
cd application-base

# Copiar el archivo de ejemplo
cp .env.example .env.local
```

**Editar `.env.local` con los siguientes valores:**

```env
# URL de Conexión a la Base de Datos PostgreSQL
DATABASE_URL="postgresql://aurora_user:changeme_in_production@localhost:5432/aurora_nova_db"

# Configuración de Auth.js
# IMPORTANTE: Genera un secreto aleatorio seguro para producción
# Puedes usar: openssl rand -base64 32
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production-min-32-chars"

# URL de la aplicación Next.js
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"

# Configuración de la aplicación
APP_NAME="Aurora Nova"
APP_URL="http://localhost:3000"

# Configuración de logging (opcional)
LOG_LEVEL="info"
```

**Notas de Seguridad**:
- NUNCA subas `.env.local` al control de versiones
- Asegúrate que `.env.local` esté en `.gitignore`
- Para producción, configura las variables en tu plataforma de hosting
- Genera secretos seguros con: `openssl rand -base64 32`

### 4. Instalación y Configuración de la Base de Datos

Con la base de datos corriendo y el entorno configurado:

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Aplicar el esquema de base de datos mediante SQL directo
# (Este proyecto usa SQL nativo en lugar de Prisma para mayor control)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f ../database/schema.sql

# 3. Poblar la base de datos con datos iniciales (roles y permisos base)
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f ../database/seeds.sql

# 4. Verificar la base de datos (opcional)
npm run db:test
```

**Nota**: Este proyecto utiliza SQL nativo con PostgreSQL 18+ para aprovechar características avanzadas como `uuidv7()` nativo. No se usa Prisma Migrate sino scripts SQL directos.

### 5. Crear Usuario Super Administrador

Antes de iniciar la aplicación, crea tu usuario administrador inicial:

```bash
# Ejecutar el script interactivo de creación de super admin
npm run db:create-super-admin

# El script te pedirá:
# - Nombre
# - Apellidos
# - Email
# - Contraseña (mínimo 8 caracteres)
```

Este script:
- Crea un nuevo usuario en la base de datos
- Asigna automáticamente el rol "Super Administrador"
- Hashea la contraseña de forma segura con bcrypt
- Verifica que el email no esté duplicado

### 6. Iniciar el Servidor de Desarrollo

```bash
# Iniciar Next.js en modo desarrollo con Turbopack
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

**Características del servidor de desarrollo**:
- Hot Module Replacement (HMR) activado
- Turbopack para compilaciones ultra-rápidas
- Soporte para Server Actions y Route Handlers
- API routes en `/api/*`

### 7. Verificar la Instalación

1. Abre `http://localhost:3000` en tu navegador
2. Verás la página de inicio de Aurora Nova
3. Navega a `/auth/signin` para iniciar sesión
4. Usa las credenciales del super administrador que creaste
5. Deberías acceder al dashboard con todos los permisos

---

## 🧪 Pruebas

### Pruebas Unitarias y de Integración (Vitest)

Aurora Nova usa Vitest como framework de testing, compatible con Jest pero más rápido.

```bash
# Ejecutar todas las pruebas una vez
npm test
# o
npm run test:run

# Ejecutar pruebas en modo "watch" para desarrollo
npm run test:watch

# Ejecutar pruebas con coverage
npm run test:coverage

# Abrir UI de Vitest (interfaz visual para pruebas)
npm run test:ui
```

**Cobertura de pruebas actual**:
- Validaciones de autenticación (Zod schemas)
- Queries de permisos y sesiones
- Utilidades de permisos y sesiones
- Mocks de Prisma para testing

**Ubicación de pruebas**: `src/__tests__/`
- `unit/` - Pruebas unitarias
- `integration/` - Pruebas de integración
- `mocks/` - Datos de prueba y mocks
- `helpers/` - Utilidades para testing

### Pruebas de Registro y Autenticación

```bash
# Probar el flujo completo de registro de usuario
npm run test:register
```

---

## 🏗️ Build y Deployment

### Build de Producción

```bash
# Crear build optimizado para producción
npm run build

# El build se genera en modo "standalone" (configurado en next.config.ts)
# Incluye todas las dependencias necesarias para deployment

# Verificar el build localmente
npm run start
```

**Características del build**:
- Modo `standalone` activado (Docker-friendly)
- Server Components optimizados
- Paquetes externos: `@prisma/client`, `bcryptjs`
- Static optimization para rutas estáticas

### Deployment

#### Opción 1: Docker (Recomendado)

El proyecto incluye un `Dockerfile` optimizado:

```bash
# Build de imagen Docker
docker build -t aurora-nova .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  aurora-nova
```

#### Opción 2: Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en el dashboard de Vercel:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
```

#### Opción 3: Otros servicios

El proyecto es compatible con:
- **Railway**: Deploy directo desde GitHub
- **Render**: Build automático con Docker
- **Fly.io**: Deployment con Dockerfile
- **AWS/Azure/GCP**: Usando contenedores o servicios serverless

**Requisitos para producción**:
1. Base de datos PostgreSQL 18+ accesible
2. Variables de entorno configuradas
3. NEXTAUTH_SECRET seguro (32+ caracteres aleatorios)
4. HTTPS habilitado (requerido por Auth.js)

---

## 🔧 Scripts Disponibles

### Desarrollo

```bash
npm run dev          # Inicia servidor de desarrollo con Turbopack
npm run build        # Build de producción (standalone mode)
npm run start        # Inicia servidor de producción
npm run lint         # Ejecuta ESLint para validar código
```

### Testing

```bash
npm test             # Ejecuta tests unitarios (alias de test:run)
npm run test:watch   # Tests en modo watch para desarrollo
npm run test:ui      # Abre interfaz visual de Vitest
npm run test:coverage # Tests con reporte de cobertura
npm run test:run     # Ejecuta todos los tests una vez
```

### Base de Datos

```bash
npm run db:test              # Verifica conexión a la base de datos
npm run db:seed              # Ejecuta script de seeds (roles y permisos)
npm run db:create-super-admin # Crea usuario super administrador (interactivo)
npm run create-test-user     # Crea usuario de prueba
npm run test:register        # Prueba el flujo de registro completo
```

**Nota**: Este proyecto no usa Prisma Migrate. Los esquemas se aplican con SQL directo:
```bash
# Aplicar esquema
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/schema.sql

# Aplicar seeds
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f database/seeds.sql
```

---

## 🗂️ Estructura del Proyecto

```
aurora-nova/
├── ai-specs/                 # Especificaciones para agentes de IA
│   └── specs/
│       ├── base-standards.mdc           # Estándares base del proyecto
│       ├── nextjs-standards.mdc         # Estándares de Next.js 16+
│       ├── mcp-integration.mdc          # Integración con MCP
│       ├── documentation-standards.mdc  # Estándares de documentación
│       ├── advanced-architecture.mdc    # Patrones arquitectónicos avanzados
│       ├── data-model.md                # Modelo de datos del proyecto
│       ├── api-spec.template.yml        # Plantilla OpenAPI 3.0
│       └── development_guide.md         # Esta guía
│
├── application-base/         # Aplicación Next.js principal
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── (protected)/ # Rutas protegidas con autenticación
│   │   │   │   ├── dashboard/
│   │   │   │   └── permissions/
│   │   │   ├── api/         # API Routes (REST endpoints)
│   │   │   ├── auth/        # Páginas de autenticación (signin, signup)
│   │   │   ├── layout.tsx   # Layout raíz
│   │   │   └── page.tsx     # Página de inicio
│   │   │
│   │   ├── components/      # Componentes React reutilizables
│   │   │   ├── ui/          # Componentes UI base (shadcn/ui)
│   │   │   └── ...          # Componentes de negocio
│   │   │
│   │   ├── lib/             # Utilidades y configuración
│   │   │   ├── auth/        # Configuración de Auth.js
│   │   │   ├── db/          # Cliente de base de datos (pg)
│   │   │   └── validations/ # Esquemas de validación (Zod)
│   │   │
│   │   ├── actions/         # Server Actions de Next.js
│   │   │   ├── auth.ts
│   │   │   └── session-management.ts
│   │   │
│   │   ├── hooks/           # Custom React Hooks
│   │   ├── types/           # Tipos TypeScript compartidos
│   │   │
│   │   └── __tests__/       # Tests con Vitest
│   │       ├── unit/        # Tests unitarios
│   │       ├── integration/ # Tests de integración
│   │       ├── mocks/       # Mocks y datos de prueba
│   │       └── helpers/     # Utilidades para testing
│   │
│   ├── scripts/             # Scripts de utilidad
│   │   ├── seed.ts          # Seeds de base de datos
│   │   ├── create-super-admin.ts
│   │   └── test-db.ts       # Verificación de conexión DB
│   │
│   ├── public/              # Assets estáticos (imágenes, fonts)
│   ├── .env.example         # Ejemplo de variables de entorno
│   ├── next.config.ts       # Configuración de Next.js
│   ├── tailwind.config.ts   # Configuración de Tailwind CSS
│   ├── vitest.config.ts     # Configuración de Vitest
│   └── package.json         # Dependencias y scripts
│
├── database/                # Esquemas SQL nativos
│   ├── schema.sql           # Esquema completo de PostgreSQL 18
│   └── seeds.sql            # Datos iniciales (roles, permisos)
│
├── docker-compose.yml       # Servicios Docker (PostgreSQL dev + test)
├── Dockerfile               # Build de producción
├── CLAUDE.md                # Instrucciones para Claude AI (symlink)
└── README.md                # Documentación general
```

### Convenciones de Código

- **Idioma**: Código en inglés, documentación en español
- **Formato**: Prettier + ESLint
- **TypeScript**: Modo estricto activado
- **Componentes**: PascalCase (ej: `UserCard.tsx`)
- **Archivos**: kebab-case para utilidades (ej: `session-utils.ts`)
- **Constantes**: UPPER_SNAKE_CASE
- **Variables/Funciones**: camelCase

---

## 🐛 Solución de Problemas

### La aplicación no inicia

1. Verifica que todas las dependencias estén instaladas:
   ```bash
   cd application-base && npm install
   ```

2. Verifica que la base de datos esté corriendo:
   ```bash
   docker ps | grep aurora-nova-db
   # Debería mostrar el contenedor corriendo
   ```

3. Verifica la conexión a la base de datos:
   ```bash
   npm run db:test
   ```

4. Verifica que las variables de entorno estén configuradas:
   ```bash
   cat .env.local
   # Debe contener DATABASE_URL, NEXTAUTH_SECRET, etc.
   ```

5. Limpia la caché de Next.js:
   ```bash
   rm -rf .next && npm run dev
   ```

### Errores de Base de Datos

**Error: "uuidv7() no disponible"**
- Asegúrate de usar PostgreSQL 18 o superior
- Verifica la versión: `docker exec aurora-nova-db psql -U aurora_user -c "SELECT version();"`

**Error: "relation does not exist"**
- Aplica el esquema de base de datos:
  ```bash
  PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f ../database/schema.sql
  ```

**Error: "No hay roles en la base de datos"**
- Ejecuta los seeds:
  ```bash
  PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f ../database/seeds.sql
  ```

**Resetear la base de datos completamente**:
```bash
# ADVERTENCIA: Esto borrará TODOS los datos
docker-compose down -v
docker-compose up -d

# Esperar a que PostgreSQL esté listo (10-15 segundos)
sleep 15

# Reaplicar esquema y seeds
cd application-base
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f ../database/schema.sql
PGPASSWORD=changeme_in_production psql -h localhost -U aurora_user -d aurora_nova_db -f ../database/seeds.sql

# Crear nuevo super admin
npm run db:create-super-admin
```

### Problemas con el puerto 3000

```bash
# Cambiar puerto temporalmente
PORT=3001 npm run dev

# O configurar en package.json:
# "dev": "next dev --turbopack -p 3001"
```

### Errores de TypeScript

```bash
# Limpiar caché de TypeScript
rm -rf .next node_modules/.cache

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Problemas con Auth.js

**Error: "NEXTAUTH_SECRET no definido"**
- Verifica que `.env.local` contenga `NEXTAUTH_SECRET`
- Genera uno nuevo: `openssl rand -base64 32`

**Error: "CSRF token mismatch"**
- Verifica que `NEXTAUTH_URL` coincida con la URL de tu aplicación
- En desarrollo debe ser: `http://localhost:3000`
- En producción debe usar HTTPS

---

## 📚 Recursos Adicionales

### Documentación del Proyecto

- [Estándares de Next.js](./nextjs-standards.mdc) - Patrones y mejores prácticas
- [Modelo de Datos](./data-model.md) - Esquema de base de datos documentado
- [Integración con MCP](./mcp-integration.mdc) - Configuración de agentes de IA
- [Estándares de Documentación](./documentation-standards.mdc)
- [Arquitecturas Avanzadas](./advanced-architecture.mdc) - DDD, Event-Driven, Feature Modules

### Tecnologías Principales

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Auth.js v5 (NextAuth)](https://authjs.dev)
- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)
- [Vitest Documentation](https://vitest.dev)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)

### Herramientas de Desarrollo

- [Turbopack](https://turbo.build/pack/docs) - Bundler ultra-rápido
- [pnpm](https://pnpm.io) - Alternativa a npm (opcional)
- [Docker Documentation](https://docs.docker.com)

---

## 🤝 Contribución

### Flujo de Trabajo

1. Fork el repositorio
2. Crea una rama para tu feature:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Realiza tus cambios siguiendo los estándares del proyecto
4. Ejecuta las pruebas:
   ```bash
   npm run test
   npm run lint
   ```
5. Commit tus cambios usando conventional commits:
   ```bash
   git commit -m "feat: agregar nueva funcionalidad de permisos"
   ```
6. Push a la rama:
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
7. Abre un Pull Request

### Conventional Commits

Usa el formato de [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `style:` - Formato, punto y coma faltante, etc.
- `refactor:` - Refactorización de código
- `test:` - Agregar o corregir tests
- `chore:` - Tareas de mantenimiento

### Estándares de Código

- Seguir las guías en `ai-specs/specs/nextjs-standards.mdc`
- Código en inglés, documentación en español
- TypeScript estricto, sin `any`
- Tests unitarios para lógica de negocio
- Componentes reutilizables y composables

---

## 📝 Licencia

[Especifica la licencia de tu proyecto aquí]

---

## 👥 Equipo

**Maintainer**: ByteFlows IVAR

---

**Última actualización**: Noviembre 2024
**Versión del Proyecto**: 0.1.0
**Stack**: Next.js 15.5 + React 19 + PostgreSQL 18 + Auth.js 5
