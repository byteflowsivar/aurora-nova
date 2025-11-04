# Proyecto: Aurora Nova

## Resumen del Proyecto

Aurora Nova es una aplicación web construida con Next.js, TypeScript y PostgreSQL. Proporciona un sistema seguro y flexible para gestionar usuarios, roles y permisos, utilizando un modelo de Control de Acceso Basado en Roles (RBAC). La aplicación utiliza `next-auth` para la autenticación, Prisma como ORM y `shadcn/ui` para la interfaz de usuario.

El proyecto está estructurado como un monorepo con la aplicación principal en el directorio `app`. El directorio `database` contiene scripts para la gestión de la base de datos, y el directorio `docs` contiene la documentación del proyecto.

## Construcción y Ejecución

### Prerrequisitos

*   [Node.js](https://nodejs.org) (v20.x o superior)
*   [npm](https://www.npmjs.com) (v9.x o superior)
*   [Docker](https://www.docker.com) y [Docker Compose](https://docs.docker.com/compose/)

### Desarrollo

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Iniciar la base de datos:**
    ```bash
    docker-compose up -d
    ```

3.  **Ejecutar migraciones y poblar la base de datos:**
    ```bash
    npm run db:deploy
    npm run db:seed
    ```

4.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Pruebas

El proyecto utiliza `vitest` para las pruebas. Los siguientes scripts están disponibles:

*   `npm test`: Ejecutar todas las pruebas.
*   `npm run test:ui`: Ejecutar pruebas con la interfaz de usuario.
*   `npm run test:run`: Ejecutar todas las pruebas una vez.
*   `npm run test:coverage`: Ejecutar pruebas y generar un informe de cobertura.
*   `npm run test:watch`: Ejecutar pruebas en modo de observación.

## Convenciones de Desarrollo

*   **Estilo de Código:** El proyecto utiliza ESLint para forzar un estilo de código consistente. Ejecuta `npm run lint` para verificar errores de linting.
*   **Prueas:** El proyecto utiliza `vitest` para pruebas unitarias y de integración. Las pruebas se encuentran en el directorio `src/__tests__`.
*   **Commits:** (No se encontró información sobre las convenciones de commit en los archivos analizados).
*   **Base de Datos:** El proyecto utiliza Prisma para las migraciones de la base de datos y como ORM. El esquema de la base de datos se define en `prisma/schema.prisma`.
