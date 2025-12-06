# Aurora Nova v1.0.0 - Production Ready

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-16+-black)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

Aurora Nova es una aplicación base lista para producción con arquitectura modular, sistema RBAC robusto, auditoría completa y documentación exhaustiva.

## 🚀 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Setup base de datos
npm run db:setup

# 3. Crear super admin
npm run db:create-super-admin

# 4. Iniciar servidor
npm run dev
```

Ir a [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentación

### 🚀 Primeros Pasos
- **[Development Guide](./docs/development_guide.md)** - Setup local y desarrollo
- **[RELEASE_NOTES](./RELEASE_NOTES.md)** - Novedades en v1.0.0

### 📖 Operación y Admin
- **[README Completo](./README.md#documentación-de-la-aplicación-base---aurora-nova)** - Esta página (desplaza abajo)
- **[Guía de Auditoría](./docs/AUDIT_SYSTEM_GUIDE.md)** - Sistema de auditoría
- **[Guía de Logging](./docs/LOGGING_GUIDE.md)** - Sistema de logging

### 🏗️ Arquitectura y Diseño
- **[Arquitectura del Proyecto](../ai-specs/specs/project-architecture.mdc)** - Decisiones arquitectónicas (CRÍTICO)
- **[Data Model](../ai-specs/specs/data-model.md)** - Diagrama ER y esquema de BD
- **[Arquitectura General](./docs/ARQUITECTURA.md)** - Visión de alto nivel
- **[Event-Driven Architecture](./docs/EVENT_DRIVEN_ARCHITECTURE.md)** - Bus de eventos

### 🔌 API Reference
- **[API Reference](./docs/API_REFERENCE.md)** - OpenAPI 3.0 completa (994 líneas)
- **[API Routes Index](./docs/API_ROUTES_INDEX.md)** - Índice navegable (26/26 endpoints)
- **[JSDoc en código](./src/app/api/)** - Documentación integrada (~9,000 líneas)

### 🚀 Deployment
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Cómo desplegar a producción
  - Vercel (recomendado)
  - Docker + Docker Compose
  - VPS (DigitalOcean, AWS)
  - Kubernetes

### 🔒 Seguridad y Compliance
- **[Security Policy](./SECURITY.md)** - Políticas de seguridad y reporte de vulnerabilidades
- **[Checklist de Seguridad](./SECURITY.md#-checklist-de-seguridad-para-desarrolladores)** - Pre-deployment

### 📊 Otros Recursos
- **[Roadmap](./docs/ROADMAP.md)** - Funcionalidades planificadas
- **[Características](./docs/CARACTERISTICAS.md)** - Descripción de features
- **[Ejemplos de Código](./docs/EJEMPLOS_CODIGO.md)** - Code samples

---

## 🎯 Características Principales

✅ **RBAC Robusto**: Roles, permisos granulares (módulo:acción)
✅ **Auditoría Completa**: Registro de todas las acciones críticas
✅ **NextAuth.js v5**: Autenticación segura con JWT + sesiones
✅ **PostgreSQL + Prisma**: BD relacional con ORM seguro
✅ **TypeScript Strict**: Tipado máximo en todo el código
✅ **26 Endpoints Documentados**: API completa con ejemplos
✅ **Menú Dinámico**: Configuración desde BD, filtrado por permisos
✅ **Event-Driven**: Bus de eventos para desacoplamiento
✅ **Logging Estructurado**: Pino con correlación de requests
✅ **DevOps Ready**: Health checks, Docker, Kubernetes

---

## 📊 Métricas de Cobertura

| Métrica | Valor |
|---------|-------|
| API Endpoints | 26/26 documentados (100%) |
| Métodos HTTP | 19 GET, 7 POST, 4 PATCH, 3 DELETE |
| JSDoc | ~9,000 líneas |
| Build | ✅ Sin errores |
| TypeScript | ✅ Strict mode |
| RBAC Roles | 3 (Super Admin, Admin, User) |

---

## 🗂️ Índice Completo

### 👨‍💼 Para Administradores y Usuarios Avanzados
1. [Conceptos Fundamentales](#1-conceptos-fundamentales)
   - Roles de Usuario
   - Permisos
2. [Flujos de Autenticación](#2-flujos-de-autenticación)
   - Registro y Login
   - Recuperación de Contraseña
3. [Funcionalidades Clave](#3-funcionalidades-clave)
   - Gestión de Usuarios y Roles (RBAC)
   - Sistema de Auditoría
   - Menú de Navegación Dinámico
4. [Configuración Inicial](#4-configuración-inicial)
   - Creación del Super Administrador

### 👩‍💻 Para Desarrolladores
1. [Arquitectura y Stack Tecnológico](#5-arquitectura-y-stack-tecnológico)
2. [Estructura del Proyecto](#6-estructura-del-proyecto)
3. [Sistemas Principales (Deep Dive)](#7-sistemas-principales-deep-dive)
   - Sistema de Autenticación Híbrido
   - Sistema de Logging Estructurado
   - Sistema de Eventos (Event-Driven)
   - Sistema de Auditoría
4. [Base de Datos](#8-base-de-datos)
   - Esquema Prisma
   - Migraciones y Seeding
5. [Testing](#9-testing)
6. [Scripts y Flujos de Trabajo](#10-scripts-y-flujos-de-trabajo)
7. [Hoja de Ruta (Roadmap)](#11-hoja-de-ruta-roadmap)

---

## 👨‍💼 Para Administradores y Usuarios Avanzados

Esta sección explica las funcionalidades desde una perspectiva de uso y gestión.

### 1. Conceptos Fundamentales

El sistema se basa en un modelo de Control de Acceso Basado en Roles (RBAC).

#### Roles de Usuario
Los roles agrupan un conjunto de permisos. Un usuario puede tener múltiples roles. El sistema incluye tres roles por defecto:
- **Super Administrador**: Acceso total y sin restricciones a todo el sistema. Este rol posee todos los permisos existentes y futuros.
- **Administrador**: Puede gestionar usuarios y roles, pero con permisos limitados. No puede acceder a configuraciones críticas del sistema.
- **Usuario**: Rol base con permisos de solo lectura para la mayoría de los módulos. Es el rol por defecto para nuevos usuarios.

#### Permisos
Los permisos son la unidad más granular de autorización. Siguen una convención `módulo:acción` (ej. `user:create`, `role:delete`). Un permiso autoriza a un usuario a realizar una acción específica. Los permisos no se asignan directamente a los usuarios, sino a los roles.

### 2. Flujos de Autenticación

#### Registro y Login
- Los usuarios se registran con su nombre, email y contraseña.
- Al registrarse, se les asigna automáticamente el rol de "Usuario".
- El login se realiza con email y contraseña. El sistema verifica las credenciales y, si son correctas, crea una sesión segura.

#### Recuperación de Contraseña
1. **Solicitud**: El usuario introduce su email en la página de "Olvidé mi contraseña".
2. **Email**: El sistema envía un correo electrónico con un enlace único y seguro para restablecer la contraseña.
3. **Restablecimiento**: El usuario sigue el enlace, que lo lleva a una página donde puede establecer una nueva contraseña.
4. **Seguridad**: Por seguridad, al cambiar la contraseña, todas las demás sesiones activas del usuario en otros dispositivos se cierran automáticamente.

### 3. Funcionalidades Clave

#### Gestión de Usuarios y Roles (RBAC)
La aplicación proporciona interfaces de usuario intuitivas para:
- **Usuarios**: Listar, crear, editar y eliminar usuarios.
- **Roles**: Listar, crear, editar y eliminar roles.
- **Asignación**: Desde la vista de un usuario, se pueden asignar y remover roles. Desde la vista de un rol, se pueden asignar y remover permisos.

#### Sistema de Auditoría
Para garantizar la trazabilidad y el cumplimiento, el sistema registra automáticamente todas las acciones críticas. Cada registro de auditoría contiene:
- **Qué** acción se realizó (ej. `login`, `user_update`).
- **Quién** la realizó (qué usuario).
- **Cuándo** se realizó (timestamp).
- **Dónde** (Dirección IP, User Agent).
- **Contexto adicional** (ej. los datos que cambiaron en una actualización).

Los administradores con el permiso `audit:view` pueden consultar este registro a través de una interfaz dedicada.

#### Menú de Navegación Dinámico
El menú lateral de la aplicación no está codificado, sino que se genera dinámicamente desde la base de datos. Cada ítem del menú puede estar asociado a un permiso, lo que significa que **el menú se adapta automáticamente a lo que el usuario tiene permitido ver**.

### 4. Configuración Inicial

#### Creación del Super Administrador
En una instalación nueva, la base de datos está vacía. El primer paso es crear el usuario "Super Administrador" que tendrá control total. Para ello, se debe ejecutar un script:
```bash
# Desde la carpeta application-base/
npm run db:create-super-admin
```
El script solicitará el nombre, email y contraseña para este usuario. **Este comando solo puede ejecutarse una vez sobre una base de datos vacía.**

---

## 👩‍💻 Para Desarrolladores

Esta sección detalla la implementación técnica y las convenciones para extender la aplicación.

### 5. Arquitectura y Stack Tecnológico
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: Auth.js (NextAuth.js) v5
- **UI**: Tailwind CSS con shadcn/ui
- **Testing**: Vitest para tests unitarios y de integración.
- **Logging**: Pino para logging estructurado.
- **Eventos**: Node.js EventEmitter para arquitectura event-driven.
- **Validación**: Zod para validación de esquemas.

### 6. Estructura del Proyecto
El código fuente se encuentra en `src/` y sigue una estructura modular y orientada a funcionalidades:
- `src/app/`: Rutas de la aplicación (App Router).
- `src/components/`: Componentes React, organizados por funcionalidad.
- `src/lib/`: Lógica de negocio principal.
  - `lib/auth/`: Configuración de Auth.js y sistema híbrido.
  - `lib/prisma/`: Conexión de Prisma y queries reutilizables.
  - `lib/logger/`: Sistema de logging estructurado.
  - `lib/events/`: Sistema de bus de eventos.
  - `lib/audit/`: Sistema de auditoría.
- `src/actions/`: Server Actions de Next.js.
- `src/types/`: Definiciones de tipos TypeScript.
- `src/__tests__/`: Todos los tests automatizados.

### 7. Sistemas Principales (Deep Dive)

#### Sistema de Autenticación Híbrido
- **Estrategia**: `jwt` en Auth.js.
- **JWT Callback**: Al iniciar sesión, se genera un JWT y simultáneamente se crea un registro en la tabla `session` de la base de datos con el `sessionToken`, IP y User-Agent.
- **Session Callback**: La información del token (incluyendo `sessionToken` y permisos) se adjunta al objeto `session`.
- **Ventaja**: Las peticiones se validan rápidamente con el JWT, pero se mantiene la capacidad de invalidar sesiones desde el servidor eliminando el registro en la tabla `session`.

#### Sistema de Logging Estructurado
- **Librería**: Pino, un logger de alto rendimiento para Node.js.
- **Trazabilidad**: Un middleware en `src/proxy.ts` inyecta un `x-request-id` en cada petición, permitiendo una correlación completa de logs.
- **Contexto Automático**: Los helpers `getLogContext` y `getApiLogContext` enriquecen los logs con información de la sesión y del request.
- **Guía Completa**: Para una guía detallada sobre cómo implementar el logging, consulta la **[Guía de Logging Estandarizado](./docs/LOGGING_GUIDE.md)**.

#### Sistema de Eventos (Event-Driven)
- **Implementación**: Basado en `EventEmitter` de Node.js, implementado como un singleton en `src/lib/events/event-bus.ts`.
- **Flujo**: Las acciones principales emiten eventos (ej. `USER_REGISTERED`), y los "listeners" suscritos reaccionan a ellos de forma asíncrona (ej. para enviar emails o auditar).
- **Ventaja**: Desacopla la lógica y mejora la extensibilidad.
- **Guía Completa**: Para aprender a usar y extender este sistema, consulta la **[Guía de Arquitectura Dirigida por Eventos](./docs/EVENT_DRIVEN_ARCHITECTURE.md)**.

#### Sistema de Auditoría
- **Implementación**: Combina un listener de eventos (para auditoría automática) con helpers manuales para casos de uso específicos.
- **Auditoría Automática**: El `AuditEventListener` se suscribe a los eventos del sistema para registrar la mayoría de las acciones de forma automática.
- **Guía Completa**: Para aprender a integrar nuevas acciones en el sistema de auditoría, consulta la **[Guía del Sistema de Auditoría](./docs/AUDIT_SYSTEM_GUIDE.md)**.

### 8. Base de Datos
- **ORM**: Prisma. El esquema se define en `prisma/schema.prisma`.
- **Migraciones**: Se gestionan con `prisma migrate`.
- **Seeding**: El script `scripts/seed.ts` puebla la base de datos con datos iniciales (roles, permisos).

### 9. Testing
- **Framework**: Vitest, configurado para un entorno JSDOM.
- **Mocks**: Se utiliza `vitest-mock-extended` para mockear el cliente de Prisma.
- **Estructura**: Los tests residen en `src/__tests__/`, organizados por `unit` e `integration`.

### 10. Scripts y Flujos de Trabajo
Desde la carpeta `application-base/`, los siguientes scripts son fundamentales:
- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila la aplicación para producción.
- `npm run db:migrate`: Aplica nuevas migraciones a la base de datos.
- `npm run db:seed`: Puebla la base de datos con datos iniciales.
- `npm run db:create-super-admin`: Script para crear el primer usuario administrador.
- `npm run test:run`: Ejecuta toda la suite de tests.

### 11. Hoja de Ruta (Roadmap)
Para ver las funcionalidades y mejoras planificadas para el futuro de esta base de aplicación, consulta nuestra **[Hoja de Ruta (Roadmap)](./docs/ROADMAP.md)**.
