# Aurora Nova

Este es un proyecto [Next.js](https://nextjs.org) para Aurora Nova, un sistema de gestión de usuarios con control de acceso basado en roles (RBAC).

## Acerca de este proyecto

Aurora Nova es una aplicación web moderna construida con Next.js, TypeScript y PostgreSQL. Proporciona un sistema seguro y flexible para la gestión de usuarios, roles y permisos.

### Características

*   **Gestión de Usuarios**: Crea, lee, actualiza y elimina usuarios.
*   **Control de Acceso Basado en Roles (RBAC)**: Define roles y asigna permisos a los mismos.
*   **Autenticación Segura**: Utiliza `next-auth` para una autenticación segura.
*   **Interfaz de Usuario Moderna**: Construida con `shadcn/ui` para una interfaz de usuario limpia y responsiva.

## Primeros pasos

### Prerrequisitos

*   [Node.js](https://nodejs.org) (v20.x o superior)
*   [npm](https://www.npmjs.com) (v9.x o superior)
*   [Docker](https://www.docker.com) y [Docker Compose](https://docs.docker.com/compose/)

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd aurora-nova/app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar la base de datos

Este proyecto usa Docker para ejecutar una base de datos PostgreSQL. Inicia el contenedor de la base de datos con:

```bash
docker-compose up -d
```

### 4. Configurar variables de entorno

Copia el archivo `.env.example` a `.env.local` y completa las variables de entorno requeridas.

```bash
cp .env.example .env.local
```

### 5. Ejecutar migraciones y seed de la base de datos

```bash
npm run db:deploy
npm run db:seed
```

### 6. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

## Construyendo y Ejecutando con Docker

Este proyecto incluye un `Dockerfile` para construir y ejecutar la aplicación en un contenedor.

### Construir la imagen Docker

Para construir la imagen Docker, ejecuta el siguiente comando en el directorio `app`:

Si necesitas especificar argumentos de construcción, usa `docker buildx build`:
```bash
docker buildx build \
--build-arg NEXTAUTH_URL="http://app:3000" \
--build-arg AUTH_TRUST_HOST=true \
--build-arg AUTH_URL="http://app:3000" \
--build-arg APP_URL="http://app:3000" \
-t byteflowsivar/aurora-nova:0.01 .
```

Alternativamente, para una construcción estándar:
```bash
docker build -t aurora-nova .
```

### Ejecutar el contenedor Docker

Una vez que la imagen ha sido construida, puedes ejecutarla en un contenedor:

```bash
docker run -p 3000:3000 aurora-nova
```

Esto iniciará la aplicación en `http://localhost:3000`.

**Nota:** Para que la aplicación se conecte a la base de datos, necesitas proporcionar las variables de entorno necesarias al contenedor. Puedes hacer esto usando la bandera `-e` en el comando `docker run`, o usando un `--env-file`.

Por ejemplo:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database_name>" \
  -e NEXTAUTH_SECRET="your_super_secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  aurora-nova
```

## Aprende más

Para aprender más sobre Next.js, echa un vistazo a los siguientes recursos:

- [Documentación de Next.js](https://nextjs.org/docs) - aprende sobre las características y la API de Next.js.
- [Aprende Next.js](https://nextjs.org/learn) - un tutorial interactivo de Next.js.

Puedes consultar [el repositorio de Next.js en GitHub](https://github.com/vercel/next.js) - ¡tus comentarios y contribuciones son bienvenidos!

## Despliegue en Vercel

La forma más fácil de desplegar tu aplicación Next.js es usar la [Plataforma Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) de los creadores de Next.js.

Consulta nuestra [documentación de despliegue de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles.