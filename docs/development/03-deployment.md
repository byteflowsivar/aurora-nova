# Guía de Despliegue y Operaciones

Este documento proporciona una guía para el despliegue y operación de Aurora Nova en entornos de producción.

## 1. Requisitos del Sistema

- **OS:** Linux (Ubuntu 22.04 LTS recomendado)
- **Node.js:** v20.x o superior
- **PostgreSQL:** v18+ (con soporte para `uuidv7()`)
- **Git**

## 2. Configuración de Producción

### Variables de Entorno
Crea un archivo `.env.production` en la raíz de `application-base` con las siguientes variables:

```env
# Base de Datos
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database_name>"

# Auth.js (IMPORTANTE: generar un secreto seguro)
NEXTAUTH_SECRET="tu_secreto_super_seguro_para_produccion"
NEXTAUTH_URL="https://tu-dominio.com"

# Next.js
NODE_ENV="production"

# Logging
LOG_LEVEL="info"
```
**Seguridad:** Utiliza un gestor de secretos para las variables sensibles.

## 3. Pasos de Despliegue

1.  **Clonar Repositorio e Instalar Dependencias:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd aurora-nova/application-base
    npm install --production
    ```

2.  **Generar Cliente Prisma y Ejecutar Migraciones:**
    ```bash
    npm run db:generate
    npm run db:deploy
    ```

3.  **Construir y Iniciar la Aplicación:**
    ```bash
    npm run build
    npm run start
    ```
    Se recomienda usar un gestor de procesos como **PM2** para mantener la aplicación en ejecución.

### 3.1. Construcción de la Imagen de Docker (Alternativa de Despliegue)

Si prefieres desplegar la aplicación como un contenedor de Docker, sigue estos pasos para construir la imagen.

1.  **Navega a la carpeta de la aplicación:**
    ```bash
    cd aurora-nova/application-base
    ```

2.  **Ejecuta el comando de construcción:**
    Este comando utiliza `docker buildx` para construir la imagen, pasando las variables de entorno necesarias durante la compilación como argumentos (`--build-arg`).

    ```bash
    docker buildx build \
    --build-arg NEXTAUTH_URL="http://app:3000" \
    --build-arg AUTH_TRUST_HOST=true \
    --build-arg AUTH_URL="http://app:3000" \
    --build-arg APP_URL="http://app:3000" \
    -t byteflowsivar/aurora-nova:latest .
    ```
    - **`-t byteflowsivar/aurora-nova:latest`**: Asigna un nombre y etiqueta a tu imagen.
    - **`.`**: Indica que el contexto de la construcción es el directorio actual (`application-base`).

## 4. Procedimientos Operativos

### Creación del Primer Super Administrador
Después del despliegue inicial, crea el primer usuario Super Admin:
```bash
npm run db:create-super-admin
```
Este script solo se puede ejecutar si no hay usuarios en la base de datos.

### Copias de Seguridad (Backups)
Implementa una estrategia de copias de seguridad robusta para tu base de datos PostgreSQL, con pruebas periódicas de restauración.

### Monitoreo y Logging
- **Health Check:** La aplicación expone un endpoint en `/api/health` para verificar su estado.
- **Logging:** En producción, los logs se emiten en formato JSON. Configura un sistema de logging centralizado para recolectarlos.
