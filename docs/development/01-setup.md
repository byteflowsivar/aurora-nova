# Guía de Configuración del Entorno

Este documento describe los pasos para configurar el entorno de desarrollo para Aurora Nova.

## 1. Prerrequisitos

- **Node.js:** v20.x o superior
- **npm:** v9.x o superior
- **Docker & Docker Compose:** Para levantar la base de datos.
- **Git:** Para clonar el repositorio.

## 2. Pasos de Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd aurora-nova
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Copia el archivo `.env.example` a `.env.local` y ajústalo si es necesario.
    ```bash
    cp application-base/.env.example application-base/.env.local
    ```

4.  **Iniciar la base de datos:**
    ```bash
    docker-compose up -d
    ```

5.  **Aplicar migraciones y seeds:**
    Este comando prepara la base de datos con el esquema y los datos iniciales.
    ```bash
    npm run db:deploy
    npm run db:seed
    ```

6.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).
