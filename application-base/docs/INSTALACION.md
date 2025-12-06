# Guía de Instalación - Aurora Nova v1.0

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025

## Tabla de Contenidos

1. [Requisitos del Sistema](#requisitos-del-sistema)
2. [Instalación Local](#instalación-local)
3. [Instalación con Docker](#instalación-con-docker)
4. [Configuración Base de Datos](#configuración-base-de-datos)
5. [Configuración Inicial](#configuración-inicial)
6. [Verificación de Instalación](#verificación-de-instalación)
7. [Troubleshooting](#troubleshooting)

---

## Requisitos del Sistema

### Mínimos
- **Node.js**: 18.17+ (recomendado 20 LTS)
- **npm**: 9+ (o pnpm 8+, yarn 4+, bun 1.0+)
- **PostgreSQL**: 14+ (local o cloud)
- **Git**: 2.40+
- **RAM**: 2GB mínimo
- **Espacio disco**: 500MB mínimo

### Recomendados
- **Node.js**: 20 LTS o superior
- **PostgreSQL**: 16+
- **RAM**: 4GB+
- **Espacio disco**: 2GB+
- **Docker**: Para containerización (opcional pero recomendado)

### Verificar Requisitos Instalados

```bash
# Verificar Node.js
node --version
# Debe mostrar: v18.17.0 o superior

# Verificar npm
npm --version
# Debe mostrar: 9.0.0 o superior

# Verificar Git
git --version
# Debe mostrar: git version 2.40.0 o superior

# Verificar PostgreSQL (si está instalado)
psql --version
# Debe mostrar: psql (PostgreSQL) 14.0 o superior
```

### Instalar Requisitos

#### macOS (con Homebrew)

```bash
# Instalar Node.js
brew install node

# Instalar PostgreSQL
brew install postgresql

# Instalar Git
brew install git

# Iniciar PostgreSQL
brew services start postgresql
```

#### Ubuntu/Debian

```bash
# Actualizar paquetes
sudo apt update
sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Instalar Git
sudo apt install git

# Iniciar PostgreSQL
sudo systemctl start postgresql
```

#### Windows

1. **Node.js**: Descargar desde https://nodejs.org
2. **PostgreSQL**: Descargar desde https://www.postgresql.org/download/windows/
3. **Git**: Descargar desde https://git-scm.com

Durante la instalación de PostgreSQL, recuerda:
- Nota el password del usuario `postgres`
- Puerto por defecto: 5432
- Instalar pgAdmin para gestionar BD

---

## Instalación Local

### Paso 1: Clonar el Repositorio

```bash
# Clonar repositorio
git clone <URL_REPOSITORIO>

# Entrar en el directorio
cd aurora-nova/application-base
```

### Paso 2: Instalar Dependencias

```bash
# Con npm
npm install

# O con pnpm (más rápido)
pnpm install

# O con yarn
yarn install

# O con bun
bun install
```

### Paso 3: Configurar Variables de Entorno

#### Crear archivo .env.local

```bash
cp .env.example .env.local
```

#### Editar .env.local

```bash
# Opción 1: Con editor de texto
nano .env.local

# Opción 2: Con VS Code
code .env.local

# Opción 3: Con tu editor favorito
vim .env.local
```

#### Configuración Mínima Requerida

```bash
# Base de Datos PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/aurora_nova_db"

# Autenticación
NEXTAUTH_SECRET="tu-clave-secreta-generada-aleatoriamente"
NEXTAUTH_URL="http://localhost:3000"
```

#### Generar NEXTAUTH_SECRET

```bash
# En macOS/Linux
openssl rand -base64 32

# En Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copia el valor generado en `NEXTAUTH_SECRET` del archivo `.env.local`

### Paso 4: Configurar Base de Datos

#### Crear Base de Datos PostgreSQL

```bash
# Conectar a PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE DATABASE aurora_nova_db;
CREATE USER aurora_user WITH ENCRYPTED PASSWORD 'changeme_in_production';
ALTER ROLE aurora_user SET client_encoding TO 'utf8';
ALTER ROLE aurora_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE aurora_user SET default_transaction_deferrable TO on;
ALTER ROLE aurora_user SET default_time_zone TO 'UTC';
ALTER USER aurora_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE aurora_nova_db TO aurora_user;
\q
```

#### Actualizar DATABASE_URL

```bash
# En .env.local
DATABASE_URL="postgresql://aurora_user:changeme_in_production@localhost:5432/aurora_nova_db"
```

#### Crear Schema

```bash
# Generar Prisma Client
npm run db:generate

# Crear schema en BD
npm run db:push
```

Deberías ver:
```
Your database is now in sync with your schema.
```

### Paso 5: Crear Super Administrador

```bash
npm run db:create-super-admin
```

El script te pedirá:
```
Email: admin@example.com
Password: TuContraseña123!
First Name: Admin
Last Name: User
```

### Paso 6: Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Deberías ver:
```
> aurora-nova@1.0.0 dev
> next dev

  ▲ Next.js 16.0.5
  - Local:        http://localhost:3000

✓ Ready in 3.2s
```

### Paso 7: Acceder a la Aplicación

Abre tu navegador y ve a: http://localhost:3000

Login con el super admin creado:
- **Email**: admin@example.com
- **Password**: TuContraseña123!

---

## Instalación con Docker

### Requisitos Previos

- Docker 20.10+
- Docker Compose 2.0+

### Verificar Docker

```bash
docker --version
docker compose --version
```

### Paso 1: Crear docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: aurora_nova_db
    environment:
      POSTGRES_USER: aurora_user
      POSTGRES_PASSWORD: changeme_in_production
      POSTGRES_DB: aurora_nova_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - aurora_network

  app:
    build: .
    container_name: aurora_nova_app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://aurora_user:changeme_in_production@postgres:5432/aurora_nova_db"
      NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
      NEXTAUTH_URL: "http://localhost:3000"
      NODE_ENV: production
    depends_on:
      - postgres
    networks:
      - aurora_network

volumes:
  postgres_data:

networks:
  aurora_network:
    driver: bridge
```

### Paso 2: Crear .env para Docker

```bash
# .env (usado por docker-compose)
NEXTAUTH_SECRET="tu-clave-secreta-aqui"
```

### Paso 3: Construir y Ejecutar

```bash
# Construir imágenes
docker compose build

# Ejecutar contenedores
docker compose up -d

# Ver logs
docker compose logs -f app
```

### Paso 4: Crear Super Admin en Docker

```bash
# Ejecutar script dentro del contenedor
docker compose exec app npm run db:create-super-admin
```

### Ver Aplicación

Abre: http://localhost:3000

---

## Configuración Base de Datos

### Variables de Entorno Base de Datos

```bash
# Formato general
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"

# Ejemplo local
DATABASE_URL="postgresql://aurora_user:changeme_in_production@localhost:5432/aurora_nova_db"

# Ejemplo cloud (Vercel PostgreSQL)
DATABASE_URL="postgresql://user:password@db.xxx.postgres.vercel-storage.com:5432/database"

# Ejemplo cloud (Railway)
DATABASE_URL="postgresql://user:password@containers-us-west-XXX.railway.app:5432/database"
```

### Comandos de Base de Datos

```bash
# Generar Prisma Client (requerido primero)
npm run db:generate

# Crear schema (desarrollo)
npm run db:push

# Ejecutar migraciones (producción)
npm run db:migrate

# Crear nueva migración
npm run db:migrate -- --name nombre_migracion

# Ver estado actual
npm run db:migrate -- --status

# Abrir Prisma Studio (GUI)
npm run db:studio

# Reset completo (CUIDADO: borra datos)
npm run db:reset

# Seed datos iniciales
npm run db:seed
```

### Solucionar Problemas de BD

#### "Error: Can't reach database server"

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql  # Linux
brew services list                # macOS
# O conexión remota:
psql -h <host> -U <user> -d <database> -c "SELECT 1"
```

#### "Error: ECONNREFUSED"

```bash
# Verificar DATABASE_URL en .env.local
# Verificar host, puerto, usuario, contraseña
# Reintentar conexión:
npm run db:push
```

#### "Error: Invalid client certificate"

Para conectarse a BD cloud con SSL:

```bash
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require&sslcert=/path/to/cert"
```

---

## Configuración Inicial

### 1. Variables de Entorno Completas

```bash
# ===== BASE DE DATOS =====
DATABASE_URL="postgresql://aurora_user:changeme_in_production@localhost:5432/aurora_nova_db"

# ===== AUTENTICACION =====
NEXTAUTH_SECRET="aqvjKzL9pQr2xY3mNwBvCdE4fGhI5jKlM6nOpQrS7tUvW8xYzAbCdEfGhIjKlM"
NEXTAUTH_URL="http://localhost:3000"

# ===== EMAIL (Nodemailer) =====
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@example.com"

# ===== LOGGING =====
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"

# ===== FEATURES =====
FEATURE_AUDIT_ENABLED="true"
FEATURE_EMAIL_ENABLED="true"

# ===== DEVELOPMENT =====
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Configuración de Email

Para usar Gmail SMTP:

1. Habilitar "Contraseñas de aplicación" en tu cuenta Google
2. Generar contraseña específica para app
3. Usar en `SMTP_PASS`

Para otros proveedores (SendGrid, Mailgun, etc.):

```bash
# SendGrid
SENDGRID_API_KEY="SG.xxxxx"

# Mailgun
MAILGUN_API_KEY="xxxxx"
MAILGUN_DOMAIN="mg.example.com"
```

### 3. Verificar Configuración

```bash
# Leer variables configuradas
cat .env.local

# Validar que todas estén definidas
npm run env:validate
```

---

## Verificación de Instalación

### Checklist de Verificación

```bash
# ✅ 1. Verificar Node.js
node --version  # Debe ser 18.17+

# ✅ 2. Verificar npm
npm --version   # Debe ser 9.0+

# ✅ 3. Verificar dependencias instaladas
ls node_modules | grep next
ls node_modules | grep prisma

# ✅ 4. Verificar archivo .env.local existe
test -f .env.local && echo "✓ .env.local existe" || echo "✗ .env.local no existe"

# ✅ 5. Verificar conexión a BD
npm run db:validate

# ✅ 6. Compilar TypeScript
npm run build

# ✅ 7. Ejecutar tests
npm run test:run

# ✅ 8. Iniciar servidor
npm run dev
```

### Test de Funcionalidad

Una vez que el servidor está corriendo:

1. Abrir http://localhost:3000
2. Login con super admin
3. Verificar acceso a:
   - `/admin/dashboard` - Dashboard
   - `/admin/users` - Gestión de usuarios
   - `/admin/audit` - Logs de auditoría
   - `/admin/roles` - Gestión de roles

---

## Troubleshooting

### Errores Comunes de Instalación

#### 1. "npm ERR! code ERESOLVE"

**Causa**: Conflicto de versiones de paquetes

**Solución**:
```bash
# Opción 1: Usar flag legacy
npm install --legacy-peer-deps

# Opción 2: Usar pnpm (más flexible)
pnpm install

# Opción 3: Limpiar caché
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 2. "Error: connect ECONNREFUSED 127.0.0.1:5432"

**Causa**: PostgreSQL no está corriendo

**Solución**:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
# Iniciar servicio PostgreSQL desde Services

# Verificar que corre
psql -U postgres -c "SELECT version();"
```

#### 3. "Error: FATAL: Ident authentication failed"

**Causa**: Credenciales incorrectas o usuario no existe

**Solución**:
```bash
# Crear usuario correcto
psql -U postgres

# En psql:
CREATE USER aurora_user WITH PASSWORD 'changeme_in_production';
GRANT ALL PRIVILEGES ON DATABASE aurora_nova_db TO aurora_user;

# Verificar DATABASE_URL en .env.local
```

#### 4. "TypeError: Cannot find module 'next'"

**Causa**: next.js no instalado

**Solución**:
```bash
npm install next react react-dom
npm run build
```

#### 5. "error: Cannot find module @prisma/client"

**Causa**: Prisma Client no generado

**Solución**:
```bash
npm run db:generate
npm run db:push
```

#### 6. "NEXTAUTH_SECRET not found"

**Causa**: Variable no configurada en .env.local

**Solución**:
```bash
# Generar secret
openssl rand -base64 32

# Agregar a .env.local:
# NEXTAUTH_SECRET="valor-generado"
```

#### 7. "Error: listen EADDRINUSE :::3000"

**Causa**: Puerto 3000 ya está en uso

**Solución**:
```bash
# Opción 1: Usar diferente puerto
PORT=3001 npm run dev

# Opción 2: Matar proceso en puerto 3000
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Verificación de Conexiones

```bash
# Verificar acceso a PostgreSQL
psql postgresql://aurora_user:changeme_in_production@localhost:5432/aurora_nova_db

# Verificar conexión desde Node.js
node -e "require('@prisma/client').PrismaClient(); console.log('✓ Prisma conectado')"

# Verificar puertos abiertos
# macOS/Linux
netstat -tuln | grep 5432   # PostgreSQL
netstat -tuln | grep 3000   # App

# Windows
netstat -ano | findstr 5432
netstat -ano | findstr 3000
```

---

## Próximos Pasos Después de Instalación

1. **Crear primer usuario**: Usa el dashboard admin
2. **Revisar documentación**: Leer [DOCUMENTACION.md](./DOCUMENTACION.md)
3. **Explorar features**:
   - Sistema de auditoría en `/admin/audit`
   - Gestión de usuarios en `/admin/users`
   - Gestión de roles en `/admin/roles`
4. **Configurar email**: Actualizar variables SMTP
5. **Deployar**: Seguir guía de deployment

---

## Soporte

Si encuentras problemas:

1. Revisar [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Buscar en issues del repositorio
3. Contactar al equipo de desarrollo

---

**Versión**: 1.0.0 Estable
**Última actualización**: Diciembre 2025
