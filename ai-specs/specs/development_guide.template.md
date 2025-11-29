# Guía de Desarrollo para Proyectos Next.js

**Plantilla**: Esta es una plantilla genérica. Copia este archivo como `development_guide.md` en tu proyecto y personalízalo según tus necesidades.

---

## 🚀 Instrucciones de Configuración

### Prerrequisitos

Asegúrate de tener instalado lo siguiente:
- **Node.js** (v18 o superior, recomendado v20+)
- **npm** (v9 o superior) o **pnpm/yarn**
- **Docker** y **Docker Compose** (si usas contenedores para base de datos)
- **Git**
- **Next.js 16+** (para soporte de MCP - Model Context Protocol)

### 1. Clonar el Repositorio

```bash
git clone [URL_DE_TU_REPOSITORIO]
cd [NOMBRE_DEL_PROYECTO]
```

### 2. Configuración de la Base de Datos

#### Opción A: Usando Docker (Recomendado)

Si usas Docker para la base de datos, configura el servicio:

```bash
# Iniciar el contenedor de la base de datos en segundo plano
docker-compose up -d

# Verificar que el contenedor esté corriendo
docker ps
```

La base de datos estará disponible localmente con las credenciales definidas en el archivo `docker-compose.yml`.

#### Opción B: Base de Datos Local

Si prefieres una instalación local de PostgreSQL/MySQL/SQLite:

1. Instala el motor de base de datos según tu preferencia
2. Crea una base de datos para el proyecto
3. Anota las credenciales de conexión

### 3. Configuración del Entorno

Crea un archivo de variables de entorno en la raíz del proyecto:

```bash
# Crear archivo .env.local
touch .env.local
```

**Añadir el siguiente contenido a `.env.local`:**

```env
# URL de Conexión a la Base de Datos para Prisma
# Formato PostgreSQL:
DATABASE_URL="postgresql://[USUARIO]:[PASSWORD]@[HOST]:[PUERTO]/[NOMBRE_DB]"

# Formato MySQL:
# DATABASE_URL="mysql://[USUARIO]:[PASSWORD]@[HOST]:[PUERTO]/[NOMBRE_DB]"

# Formato SQLite (desarrollo):
# DATABASE_URL="file:./dev.db"

# URL pública de la aplicación
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Configuración de Autenticación (si aplica)
# NEXTAUTH_URL="http://localhost:3000"
# NEXTAUTH_SECRET="[GENERA_UN_SECRET_SEGURO]"

# API Keys externas (ejemplos)
# STRIPE_SECRET_KEY="sk_test_..."
# SENDGRID_API_KEY="SG..."
# CLOUDINARY_URL="cloudinary://..."

# Variables de desarrollo
NODE_ENV="development"
```

**Notas de Seguridad**:
- NUNCA subas `.env.local` al control de versiones
- Asegúrate que `.env.local` esté en `.gitignore`
- Para producción, configura las variables en tu plataforma de hosting

### 4. Instalación y Ejecución de la Aplicación

Con la base de datos corriendo y el entorno configurado, instala las dependencias y ejecuta la aplicación:

```bash
# 1. Instalar dependencias del proyecto
npm install
# o
pnpm install
# o
yarn install

# 2. Generar el cliente de Prisma
npx prisma generate

# 3. Aplicar las migraciones de la base de datos para crear las tablas
npx prisma migrate deploy
# o para desarrollo:
npx prisma migrate dev

# 4. (Opcional) Poblar la base de datos con datos de prueba
npx prisma db seed

# 5. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación Next.js estará disponible en `http://localhost:3000`. Incluirá tanto el frontend como las rutas de API.

### 5. (Opcional) Configurar MCP para Desarrollo Asistido por IA

Si deseas utilizar agentes de IA con acceso en tiempo real a tu aplicación Next.js, configura MCP:

```bash
# Crear archivo de configuración MCP en la raíz
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
EOF
```

Con el servidor de desarrollo corriendo, los agentes de IA podrán acceder a errores, logs, metadata de páginas y más.

**Nota**: Para más información sobre MCP, consulta [mcp-integration.mdc](./mcp-integration.mdc).

---

## 🧪 Pruebas

### Pruebas Unitarias y de Integración (Jest)

```bash
# Ejecutar todas las pruebas una vez
npm test

# Ejecutar pruebas en modo "watch" para desarrollo
npm run test:watch

# Ejecutar pruebas con coverage
npm run test:coverage
```

### Pruebas End-to-End (Cypress / Playwright)

#### Con Cypress:

```bash
# Abrir el lanzador de pruebas de Cypress en modo interactivo
npm run cypress:open

# Ejecutar todas las pruebas E2E en modo "headless" (sin UI)
npm run cypress:run
```

#### Con Playwright:

```bash
# Ejecutar pruebas de Playwright
npm run playwright:test

# Ejecutar pruebas en modo UI
npm run playwright:test --ui

# Ejecutar pruebas específicas
npm run playwright:test tests/auth.spec.ts
```

---

## 🏗️ Build y Deployment

### Build de Producción

```bash
# Crear build optimizado para producción
npm run build

# Verificar el build localmente
npm run start
```

### Deployment

#### Vercel (Recomendado para Next.js)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Docker

```bash
# Build de imagen Docker
docker build -t [nombre-imagen] .

# Ejecutar contenedor
docker run -p 3000:3000 [nombre-imagen]
```

#### Otros servicios

Consulta la documentación específica de tu plataforma:
- Netlify
- Railway
- Render
- AWS/Azure/GCP

---

## 🔧 Scripts Disponibles

```bash
npm run dev          # Inicia servidor de desarrollo
npm run build        # Build de producción
npm run start        # Inicia servidor de producción
npm run lint         # Ejecuta ESLint
npm run format       # Formatea código con Prettier
npm test             # Ejecuta tests unitarios
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con reporte de cobertura
```

---

## 🗂️ Estructura del Proyecto

```
[nombre-proyecto]/
├── prisma/
│   ├── schema.prisma    # Esquema de base de datos
│   ├── migrations/      # Migraciones
│   └── seed.ts          # Datos de prueba
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── api/       # API Routes
│   │   └── (pages)/   # Páginas de la aplicación
│   ├── components/    # Componentes React
│   ├── lib/          # Utilidades y configuración
│   ├── services/     # Lógica de negocio
│   └── repositories/ # Acceso a datos
├── public/           # Assets estáticos
├── tests/            # Tests E2E
├── .env.local        # Variables de entorno (NO COMMIT)
├── .env.example      # Ejemplo de variables (SÍ COMMIT)
├── package.json
└── tsconfig.json
```

---

## 🐛 Solución de Problemas

### La aplicación no inicia

1. Verifica que todas las dependencias estén instaladas: `npm install`
2. Verifica que la base de datos esté corriendo
3. Verifica que las variables de entorno estén configuradas correctamente
4. Limpia la caché: `rm -rf .next && npm run dev`

### Errores de Prisma

```bash
# Regenerar cliente de Prisma
npx prisma generate

# Reset completo de base de datos (¡CUIDADO! Borra todos los datos)
npx prisma migrate reset

# Ver el estado de migraciones
npx prisma migrate status
```

### Problemas con el puerto 3000

```bash
# Cambiar puerto temporalmente
PORT=3001 npm run dev

# O configurar en package.json:
# "dev": "next dev -p 3001"
```

---

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)
- [Estándares de Next.js del Proyecto](./nextjs-standards.mdc)
- [Integración con MCP](./mcp-integration.mdc)
- [Modelo de Datos del Proyecto](./data-model.md)
- [Especificación de API](./api-spec.yml)

---

## 🤝 Contribución

[Agrega aquí las directrices de contribución de tu proyecto]

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📝 Licencia

[Especifica la licencia de tu proyecto: MIT, Apache 2.0, etc.]

---

## 👥 Equipo

[Lista los miembros del equipo o mantenedores del proyecto]

---

**Última actualización**: [Fecha]
**Versión**: [x.x.x]
