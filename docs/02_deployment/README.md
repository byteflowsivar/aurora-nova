# 02: Guía de Despliegue y Operaciones

## Introducción

Este documento proporciona una guía detallada para el despliegue, configuración y operación de la aplicación Aurora Nova en entornos de producción. Cubre los pasos necesarios para preparar el entorno, configurar la base de datos y asegurar un funcionamiento óptimo.

## 1. Requisitos del Sistema

*   **Sistema Operativo:** Linux (Ubuntu Server 22.04 LTS o superior recomendado)
*   **Node.js:** Versión 20.x o superior
*   **npm:** Versión 9.x o superior
*   **PostgreSQL:** Versión 18+ (con soporte para `uuidv7()`)
*   **Git:** Para clonar el repositorio
*   **Docker & Docker Compose:** Opcional, para la base de datos o despliegue en contenedores

## 2. Configuración del Entorno de Producción

### 2.1. Variables de Entorno

Crea un archivo `.env.production` en la raíz del proyecto (`/aurora-nova/app/.env.production`) con las siguientes variables. Asegúrate de que los valores sean seguros y específicos para producción.

```env
# Configuración de Base de Datos PostgreSQL
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database_name>"

# Configuración de Auth.js
# IMPORTANTE: Genera un secreto aleatorio y seguro (mínimo 32 caracteres)
NEXTAUTH_SECRET="tu_secreto_super_seguro_para_produccion_min_32_chars"
NEXTAUTH_URL="https://tu-dominio.com"

# Configuración de Next.js
NODE_ENV="production"

# Configuración de la aplicación
APP_NAME="Aurora Nova"
APP_URL="https://tu-dominio.com"

# Configuración de logging (opcional)
LOG_LEVEL="info" # o "warn", "error"

# Configuración de email (para futuras funcionalidades)
# SMTP_HOST=""
# SMTP_PORT=""
# SMTP_USER=""
# SMTP_PASS=""
# FROM_EMAIL=""
```

**Consideraciones de Seguridad:**
*   Nunca expongas `NEXTAUTH_SECRET` públicamente.
*   Utiliza un gestor de secretos (ej. HashiCorp Vault, AWS Secrets Manager) para `DATABASE_URL` y `NEXTAUTH_SECRET`.

### 2.2. Configuración de la Base de Datos PostgreSQL

Asegúrate de que tu servidor PostgreSQL esté configurado para:
*   Aceptar conexiones desde el servidor de la aplicación.
*   Tener un usuario y una base de datos dedicados para Aurora Nova con los permisos adecuados.
*   Soportar la función `uuidv7()`. Si no está disponible, deberás instalar la extensión `uuid-ossp` o similar.

## 3. Pasos de Despliegue

### 3.1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd aurora-nova/app
```

### 3.2. Instalar Dependencias

```bash
npm install --production
```

### 3.3. Generar el Cliente Prisma

```bash
npm run db:generate
```

### 3.4. Ejecutar Migraciones de Base de Datos

```bash
npm run db:deploy
```

### 3.5. Construir la Aplicación Next.js

```bash
npm run build
```

### 3.6. Iniciar la Aplicación

```bash
npm run start
```

Se recomienda usar un gestor de procesos como PM2 o systemd para mantener la aplicación en ejecución y reiniciarla automáticamente en caso de fallos.

## 4. Procedimientos Operativos

### 4.1. Creación del Primer Super Administrador

Después del despliegue inicial y antes de que la aplicación esté disponible públicamente, crea el primer usuario Super Administrador utilizando el script CLI:

```bash
npm run db:create-super-admin
```

Este script te guiará para introducir los datos del Super Administrador. Recuerda que solo se puede ejecutar si no hay usuarios en la base de datos.

### 4.2. Copias de Seguridad (Backups)

Implementa una estrategia robusta de copias de seguridad para tu base de datos PostgreSQL. Considera:
*   Copias de seguridad diarias/semanales.
*   Almacenamiento en ubicaciones geográficamente redundantes.
*   Pruebas periódicas de restauración.

### 4.3. Monitoreo y Logging

Configura herramientas de monitoreo para la aplicación y la base de datos. Asegúrate de que los logs de la aplicación (`LOG_LEVEL`) estén configurados adecuadamente para producción y sean centralizados para facilitar el análisis de problemas.

**Health Check Endpoint:**

La aplicación expone un endpoint de health check en `/api/health`. Puedes usar este endpoint para verificar el estado de la aplicación. Una respuesta exitosa (código 200) se verá así:

```json
{
  "status": "ok",
  "timestamp": "2025-11-02T12:00:00.000Z"
}
```

**Configuración de Logging:**

El nivel de logging se puede configurar a través de la variable de entorno `LOG_LEVEL`. Los niveles disponibles son:
*   `debug`: Información de debugging detallada.
*   `info`: Mensajes informativos (por defecto).
*   `warn`: Advertencias.
*   `error`: Errores.

En desarrollo, los logs se muestran en un formato legible (`pino-pretty`). En producción, se emiten en formato JSON para ser procesados por un sistema de logging centralizado.

### 4.4. Actualizaciones y Mantenimiento

*   **Actualizaciones de Dependencias:** Mantén las dependencias actualizadas para incorporar parches de seguridad y mejoras de rendimiento.
*   **Actualizaciones de Prisma:** Ejecuta `npm run db:generate` y `npm run db:deploy` después de cualquier cambio en el esquema de Prisma.
*   **Mantenimiento de BD:** Realiza tareas de mantenimiento de PostgreSQL (ej. `VACUUM`, `REINDEX`) periódicamente.

## 5. Consideraciones de Seguridad Adicionales

*   **Firewall:** Configura un firewall para restringir el acceso a los puertos necesarios.
*   **HTTPS:** Asegura que toda la comunicación con la aplicación se realice a través de HTTPS.
*   **Auditorías de Seguridad:** Realiza auditorías de seguridad periódicas del código y la infraestructura.

---

**Fin de la Guía de Despliegue y Operaciones**
