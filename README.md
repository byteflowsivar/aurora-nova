# Aurora Nova

**Una fundación de aplicaciones de grado empresarial sobre Next.js, lista para producción y diseñada para el desarrollo acelerado.**

---

## Descripción General

**Aurora Nova** es una base de código robusta y escalable construida con Next.js, TypeScript y PostgreSQL. Su propósito es servir como una fundación sólida para el desarrollo de aplicaciones empresariales complejas, como plataformas SaaS, paneles de administración y herramientas internas.

Este proyecto va más allá de un simple *boilerplate*. Proporciona una arquitectura cohesiva y funcionalidades listas para producción que resuelven los desafíos más comunes del desarrollo de software moderno, permitiendo a los equipos enfocarse en la lógica de negocio desde el primer día.

## 📜 Filosofía del Proyecto

- **Seguridad por Defecto:** Integración de las mejores prácticas de seguridad, desde la autenticación hasta la gestión de la infraestructura.
- **Escalabilidad y Mantenimiento:** Una arquitectura limpia y modular que permite crecer de forma ordenada y sostenible.
- **Desarrollo Dirigido por IA:** El proyecto se adhiere a un estricto conjunto de reglas de desarrollo (`GEMINI.md`) diseñadas para la colaboración con agentes de IA. Esto asegura consistencia, calidad y acelera el ciclo de vida del desarrollo.

## ✨ Características Principales

### Arquitectura y Stack Principal
- **Framework Moderno:** Construido con **Next.js 16** (`16.0.5`) y **React 19**.
- **Seguridad de Tipos:** Código 100% TypeScript en modo estricto.
- **Base de Datos Robusta:** Utiliza **PostgreSQL** con **Prisma ORM** para una gestión de datos segura y eficiente.
- **Contenerización:** Configuración lista para desarrollo y producción con **Docker** y Docker Compose.
- **Validación de Esquemas:** Uso de **Zod** para validación de datos del lado del cliente y del servidor.

### Seguridad y Autenticación
- **Autenticación Híbrida:** Implementada con **Auth.js v5** (`next-auth`), combinando la seguridad de sesiones en base de datos con la flexibilidad de JWT.
- **Autorización Granular (RBAC):** Sistema de permisos detallado (`módulo:acción`) que permite un control de acceso preciso tanto en el frontend (limitando vistas) como en el backend (protegiendo APIs).
- **Prevención de Ataques de Fuerza Bruta:** Implementación de **Rate Limiting** para proteger los endpoints críticos de la API.
- **Gestión de Contraseñas Segura:** Hasheo de contraseñas con `bcrypt`.

### Funcionalidades Empresariales
- **Sistema de Auditoría (Audit Trail):** Registro detallado de todas las acciones críticas realizadas en el sistema, quién las hizo y cuándo. Indispensable para cumplimiento y trazabilidad.
- **Logging Estructurado:** Uso de `pino` para generar logs estructurados en formato JSON, facilitando la observabilidad y el debugging en entornos de producción.
- **Servicio de Notificaciones por Email:** Módulo transaccional para el envío de correos (ej. bienvenida, reseteo de contraseña) utilizando `nodemailer` y plantillas `mustache`.

### Experiencia de Desarrollo (DX) y UI
- **UI Moderna y Personalizable:** Interfaz construida con **shadcn/ui** y **Tailwind CSS**, siguiendo un sistema de diseño consistente.
- **Menú Dinámico:** La barra de navegación y los menús se generan dinámicamente desde la base de datos, adaptándose automáticamente a los permisos del rol de cada usuario.
- **Testing Integrado:** Configuración completa para tests unitarios y de integración con **Vitest**.
- **Scripts de Base de Datos:** Incluye scripts para `seed`, `reset`, `deploy` y crear usuarios de prueba, agilizando el desarrollo y las pruebas.
- **Calidad de Código:** Linting y formateo preconfigurado con ESLint.

## 🚀 Stack Tecnológico

- **Framework:** Next.js `16.0.5`
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** Prisma
- **Autenticación:** Auth.js (NextAuth.js) v5
- **UI:** shadcn/ui y Tailwind CSS
- **Testing:** Vitest
- **Validación:** Zod
- **Logging:** Pino
- **Emails:** Nodemailer
- **Contenerización:** Docker

## 🏁 Inicio Rápido (Quickstart)

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

2.  **Instala las dependencias en el workspace correcto:**
    ```bash
    cd application-base
    npm install
    ```

3.  **Configura las variables de entorno:**
    Dentro de `application-base/`, copia el archivo de ejemplo y ajústalo si es necesario.
    ```bash
    cp .env.example .env.local
    ```

4.  **Inicia la base de datos:**
    Desde la raíz del proyecto (`aurora-nova/`), ejecuta:
    ```bash
    docker-compose up -d
    ```

5.  **Prepara la base de datos:**
    Desde `application-base/`, ejecuta estos comandos para aplicar migraciones y poblar la base de datos con datos iniciales (permisos, roles, etc.).
    ```bash
    npm run db:deploy
    npm run db:seed
    ```

6.  **Ejecuta el servidor de desarrollo:**
    Desde `application-base/`:
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
    ```bash
    docker buildx build \
    --build-arg NEXTAUTH_URL="http://app:3000" \
    --build-arg AUTH_TRUST_HOST=true \
    --build-arg AUTH_URL="http://app:3000" \
    --build-arg APP_URL="http://app:3000" \
    -t byteflowsivar/aurora-nova:latest .
    ```

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si quieres ayudar a mejorar Aurora Nova, por favor, lee nuestra **[Guía de Contribución](./CONTRIBUTING.md)** para empezar.

También, asegúrate de seguir nuestro **[Código de Conducta](./CODE_OF_CONDUCT.md)**.

## 📄 Licencia

Este proyecto está bajo la **[Licencia MIT](./LICENSE)**.