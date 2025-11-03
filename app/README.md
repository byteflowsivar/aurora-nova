# Aurora Nova

Este es un proyecto [Next.js](https://nextjs.org) para Aurora Nova, un sistema de gestión de usuarios con control de acceso basado en roles (RBAC).

## Acerca de este proyecto

Aurora Nova es una aplicación web moderna construida con Next.js, TypeScript y PostgreSQL. Proporciona un sistema seguro y flexible para la gestión de usuarios, roles y permisos.

### Características

*   **Gestión de Usuarios**: Crea, lee, actualiza y elimina usuarios.
*   **Control de Acceso Basado en Roles (RBAC)**: Define roles y asigna permisos a los mismos.
*   **Autenticación Segura**: Utiliza `next-auth` para una autenticación segura.
*   **Interfaz de Usuario Moderna**: Construida con `shadcn/ui` para una interfaz de usuario limpia y responsiva.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org) (v20.x or later)
*   [npm](https://www.npmjs.com) (v9.x or later)
*   [Docker](https://www.docker.com) and [Docker Compose](https://docs.docker.com/compose/)

### 1. Clone the repository

```bash
git clone <URL_DEL_REPOSITORIO>
cd aurora-nova/app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

This project uses Docker to run a PostgreSQL database. Start the database container with:

```bash
docker-compose up -d
```

### 4. Set up environment variables

Copy the `.env.example` file to `.env.local` and fill in the required environment variables.

```bash
cp .env.example .env.local
```

### 5. Run database migrations and seed

```bash
npm run db:deploy
npm run db:seed
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Building and Running with Docker

This project includes a `Dockerfile` to build and run the application in a container.

### Build the Docker image

To build the Docker image, run the following command in the `app` directory:

```bash
docker build -t aurora-nova .
```

### Run the Docker container

Once the image is built, you can run it in a container:

```bash
docker run -p 3000:3000 aurora-nova
```

This will start the application on `http://localhost:3000`.

**Note:** For the application to connect to the database, you need to provide the necessary environment variables to the container. You can do this using the `-e` flag in the `docker run` command, or by using an `--env-file`.

For example:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database_name>" \
  -e NEXTAUTH_SECRET="your_super_secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  aurora-nova
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.