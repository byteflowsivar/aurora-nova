# Aurora Nova

**Una base de aplicación Next.js lista para producción con un sistema RBAC avanzado.**

---





## Descripción General

**Aurora Nova** es una aplicación web construida con Next.js, TypeScript y PostgreSQL, diseñada para servir como una base robusta y escalable para futuros proyectos. Proporciona un sistema seguro y flexible para gestionar usuarios, roles y permisos, utilizando un modelo de Control de Acceso Basado en Roles (RBAC) desde el primer momento.

El objetivo de este proyecto es acelerar el desarrollo al proporcionar una solución lista para producción para los desafíos comunes de autenticación y autorización.

## ✨ Características Principales

-   **Framework Moderno:** Construido con Next.js 15 y React 19.
-   **Autenticación Segura:** Sistema de autenticación híbrido (JWT + Sesión en BD) implementado con `next-auth` (Auth.js).
-   **Autorización Granular (RBAC):** Sistema de permisos detallado (`módulo:acción`) para un control de acceso preciso en el backend y frontend.
-   **Gestión Completa:** Interfaces de usuario para la administración de Usuarios, Roles y Permisos.
-   **UI Moderna y Personalizable:** Interfaz construida con **shadcn/ui** y **Tailwind CSS**.
-   **Base de Datos Robusta:** Utiliza **PostgreSQL** y gestiona el esquema con **Prisma ORM**.
-   **Menú Dinámico:** La navegación se genera dinámicamente desde la base de datos y se adapta a los permisos del usuario.
-   **Testing Integrado:** Configuración de testing lista para usar con **Vitest**.

## 🚀 Stack Tecnológico

-   **Framework:** [Next.js](https://nextjs.org/)
-   **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
-   **Base de Datos:** [PostgreSQL](https://www.postgresql.org/)
-   **Autenticación:** [Auth.js (NextAuth.js)](https://authjs.dev/)
-   **ORM:** [Prisma](https://www.prisma.io/)
-   **UI:** [shadcn/ui](https://ui.shadcn.com/) y [Tailwind CSS](https://tailwindcss.com/)
-   **Testing:** [Vitest](https://vitest.dev/)
-   **Contenerización:** [Docker](https://www.docker.com/)

## 🏁 Inicio Rápido (Quickstart)

Sigue estos pasos para tener una instancia de Aurora Nova funcionando en tu máquina local.

### 1. Prerrequisitos

-   Node.js (v20.x o superior)
-   npm (v9.x o superior)
-   Docker y Docker Compose

### 2. Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/aurora-nova.git
    cd aurora-nova
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Copia el archivo de ejemplo y ajústalo si es necesario.
    ```bash
    cp application-base/.env.example application-base/.env.local
    ```

4.  **Inicia la base de datos:**
    ```bash
    docker-compose up -d
    ```

5.  **Prepara la base de datos:**
    Este comando aplica las migraciones y puebla la base de datos con datos iniciales (permisos, roles, etc.).
    ```bash
    npm run db:deploy
    npm run db:seed
    ```

6.  **Ejecuta el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

¡La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)!

## 🐳 Construcción de la Imagen de Docker

Para crear una imagen de Docker para producción, es necesario pasar ciertas variables de entorno durante el proceso de construcción.

1.  **Navega a la carpeta de la aplicación:**
    ```bash
    cd application-base
    ```

2.  **Ejecuta el comando de construcción:**
    El siguiente comando utiliza `docker buildx` para construir la imagen, pasando las variables necesarias como argumentos (`--build-arg`).

    ```bash
    docker buildx build \
    --build-arg NEXTAUTH_URL="http://app:3000" \
    --build-arg AUTH_TRUST_HOST=true \
    --build-arg AUTH_URL="http://app:3000" \
    --build-arg APP_URL="http://app:3000" \
    -t byteflowsivar/aurora-nova:latest .
    ```
    - **`-t byteflowsivar/aurora-nova:latest`**: Asigna un nombre y etiqueta a tu imagen. Cambia `latest` por una versión específica si lo necesitas (ej. `0.0.4`).
    - **`.`**: Indica que el contexto de la construcción es el directorio actual (`application-base`).

## 📚 Documentación

-   Para una guía detallada sobre la arquitectura, los módulos y las decisiones de diseño, consulta nuestra **[documentación completa](./docs/README.md)**.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si quieres ayudar a mejorar Aurora Nova, por favor, lee nuestra **[Guía de Contribución](./CONTRIBUTING.md)** para empezar.

También, asegúrate de seguir nuestro **[Código de Conducta](./CODE_OF_CONDUCT.md)**.

## 📄 Licencia

Este proyecto está bajo la **[Licencia MIT](./LICENSE)**.
