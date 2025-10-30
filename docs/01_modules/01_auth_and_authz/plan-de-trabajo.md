# Plan de Trabajo - Módulo de Autenticación y Autorización

**Proyecto:** Aurora Nova
**Módulo:** 01_auth_and_authz
**Fecha de Creación:** 2025-10-29
**Estado:** En Planificación

## Resumen Ejecutivo

Este documento presenta el plan de trabajo detallado para implementar el módulo completo de autenticación y autorización de Aurora Nova. El plan está organizado en 6 fases secuenciales, cada una con tareas específicas, dependencias claramente definidas y criterios de aceptación.

## Objetivos del Plan

- Implementar un sistema de autenticación seguro usando Lucia Auth
- Desarrollar un sistema de autorización basado en roles (RBAC)
- Crear interfaces de usuario para gestión de usuarios, roles y permisos
- Establecer mecanismos de seguridad y auditoría
- Entregar un módulo completamente funcional y testeado

## Estructura del Plan

El plan está dividido en **6 fases principales** con **32 tareas** en total. Cada tarea incluye:
- **ID único** para referencia
- **Nombre descriptivo**
- **Descripción detallada**
- **Estado actual**
- **Dependencias** (referencias a otras tareas)
- **Estimación de tiempo**

---

## FASE 1: CONFIGURACIÓN INICIAL Y BASE DE DATOS

| ID | Nombre | Descripción | Estado | Dependencias | Estimación |
|---|---|---|---|---|---|
| **T001** | Configuración PostgreSQL 18+ | Instalar y configurar PostgreSQL 18+ en desarrollo con soporte nativo para uuidv7() | **✅ COMPLETADO** | - | ~~4h~~ |
| **T002** | Configuración del entorno Next.js | Inicializar proyecto Next.js con TypeScript, configurar variables de entorno y estructura base | **✅ COMPLETADO** | - | ~~2h~~ |
| **T003** | Creación del esquema de base de datos | Ejecutar scripts SQL para crear todas las tablas del módulo auth (user, session, key, role, permission, user_role, role_permission) | **✅ COMPLETADO** | T001 | ~~3h~~ |
| **T004** | Configuración de migraciones | Configurar sistema de migraciones de BD (Drizzle ORM o similar) y crear migración inicial | **✅ COMPLETADO** | T002, T003 | ~~4h~~ |
| **T005** | Seeders de datos iniciales | Crear scripts para poblar permisos base y rol de Super Administrador | **✅ COMPLETADO** | T003 | ~~3h~~ |

---

## FASE 2: IMPLEMENTACIÓN DEL CORE DE AUTENTICACIÓN

| ID | Nombre | Descripción | Estado | Dependencias | Estimación |
|---|---|---|---|---|---|
| **T006** | Instalación y configuración de Auth.js | Instalar Auth.js, configurar adaptadores para PostgreSQL y configuración inicial | **✅ COMPLETADO** | T002, T004 | ~~6h~~ |
| **T007** | Modelos de datos y tipos TypeScript | Definir interfaces TypeScript para User, Session, Account y configurar tipos para Auth.js | **✅ COMPLETADO** | T006 | ~~4h~~ |
| **T008** | Implementación de registro de usuarios | Crear funcionalidad para registrar nuevos usuarios con validación de email y hash de contraseñas | Pendiente | T007 | 8h |
| **T009** | Implementación de login/logout | Desarrollar endpoints y lógica para inicio y cierre de sesión usando Lucia Auth | Pendiente | T008 | 6h |
| **T010** | Middleware de autenticación | Crear middleware para validar sesiones en rutas protegidas | Pendiente | T009 | 4h |
| **T011** | Gestión de sesiones | Implementar funcionalidades para listar, invalidar y gestionar sesiones activas | Pendiente | T010 | 5h |

---

## FASE 3: IMPLEMENTACIÓN DE AUTORIZACIÓN (RBAC)

| ID | Nombre | Descripción | Estado | Dependencias | Estimación |
|---|---|---|---|---|---|
| **T012** | Sistema de permisos base | Implementar lógica para verificar permisos usando IDs semánticos (ej: 'user:create') | Pendiente | T010 | 6h |
| **T013** | Gestión de roles - CRUD | Crear operaciones CRUD para roles con validaciones y restricciones de seguridad | Pendiente | T012 | 8h |
| **T014** | Asignación de permisos a roles | Implementar funcionalidad para asignar/desasignar permisos a roles específicos | Pendiente | T013 | 6h |
| **T015** | Asignación de roles a usuarios | Desarrollar sistema para asignar/desasignar roles a usuarios con auditoría | Pendiente | T014 | 6h |
| **T016** | Middleware de autorización | Crear middleware para verificar permisos específicos en rutas de API | Pendiente | T015 | 5h |
| **T017** | Helpers de autorización | Implementar funciones auxiliares para verificación de permisos en componentes UI | Pendiente | T016 | 4h |

---

## FASE 4: INTERFACES DE USUARIO

| ID | Nombre | Descripción | Estado | Dependencias | Estimación |
|---|---|---|---|---|---|
| **T018** | Configuración de shadcn/ui | Instalar y configurar shadcn/ui con tema "Blue" y componentes base necesarios | **✅ COMPLETADO** | T002 | ~~2h~~ |
| **T019** | Páginas de autenticación | Crear páginas de login, registro y recuperación de contraseña con validaciones | Pendiente | T009, T018 | 10h |
| **T020** | Dashboard principal | Desarrollar dashboard principal con navegación y información de usuario autenticado | Pendiente | T017, T019 | 8h |
| **T021** | Interfaz de gestión de usuarios | Crear páginas para listar, crear, editar y gestionar usuarios del sistema | Pendiente | T020 | 12h |
| **T022** | Interfaz de gestión de roles | Desarrollar páginas para administrar roles y sus permisos asociados | Pendiente | T021 | 10h |
| **T023** | Interfaz de asignación de roles | Crear funcionalidad UI para asignar roles a usuarios con búsqueda y filtros | Pendiente | T022 | 8h |

---

## FASE 5: TESTING Y VALIDACIÓN

| ID | Nombre | Descripción | Estado | Dependencias | Estimación |
|---|---|---|---|---|---|
| **T024** | Tests unitarios - Autenticación | Escribir tests unitarios para todas las funciones de autenticación y Lucia Auth | Pendiente | T011 | 8h |
| **T025** | Tests unitarios - Autorización | Crear tests unitarios para sistema RBAC y verificación de permisos | Pendiente | T017 | 8h |
| **T026** | Tests de integración - API | Desarrollar tests de integración para todos los endpoints de la API de auth | Pendiente | T025 | 10h |
| **T027** | Tests E2E - Flujos críticos | Implementar tests end-to-end para flujos de login, registro y gestión de usuarios | Pendiente | T023 | 12h |
| **T028** | Validación de seguridad | Realizar auditoría de seguridad, validar hashing de contraseñas y protección CSRF/XSS | Pendiente | T027 | 6h |

---

## FASE 6: DEPLOYMENT Y PRODUCCIÓN

| ID | Nombre | Descripción | Estado | Dependientes | Estimación |
|---|---|---|---|---|---|
| **T029** | Script de creación de Super Admin | Implementar CLI tool para crear el primer usuario Super Admin según RF-001 | Pendiente | T028 | 5h |
| **T030** | Configuración de producción | Configurar variables de entorno, secretos y configuraciones específicas para producción | Pendiente | T029 | 4h |
| **T031** | Documentación de despliegue | Crear guías de despliegue, configuración de BD en producción y procedimientos operativos | Pendiente | T030 | 6h |
| **T032** | Monitoring y logs | Implementar logging detallado y métricas para monitoreo de autenticación y errores | Pendiente | T031 | 4h |

---

## Resumen por Fases

| Fase | Tareas | Estimación Total | Dependencia Crítica |
|---|---|---|---|
| **Fase 1** | T001 - T005 | ~~20h~~ **✅ 0h** | Configuración base **COMPLETADA** |
| **Fase 2** | T006 - T011 | 33h | Lucia Auth funcional |
| **Fase 3** | T012 - T017 | 35h | RBAC completo |
| **Fase 4** | T018 - T023 | ~~52h~~ **50h** | UI funcional |
| **Fase 5** | T024 - T028 | 44h | Sistema validado |
| **Fase 6** | T029 - T032 | 19h | Listo para producción |

**TOTAL ESTIMADO:** ~~203h~~ **175 horas (~4.4 semanas para 1 desarrollador)**

---

## Notas Importantes

### Dependencias Críticas
- **PostgreSQL 18+** es requisito absoluto para función nativa uuidv7()
- **Lucia Auth** debe estar completamente configurado antes de desarrollar UI
- **Sistema RBAC** debe estar funcional antes de implementar interfaces de gestión

### Riesgos Identificados
- Disponibilidad de PostgreSQL 18+ en entorno de despliegue
- Curva de aprendizaje de Lucia Auth para el equipo
- Complejidad del sistema RBAC puede requerir tiempo adicional

### Criterios de Calidad
- Cobertura de tests mínima del 80%
- Todas las funcionalidades deben cumplir con requerimientos de seguridad (RNF-001)
- Rendimiento debe cumplir métricas establecidas (p95 < 500ms)

---

## Estado Actual del Proyecto (2025-10-29)

### ✅ Completado
- **T001 - PostgreSQL 18+**: Configurado via Docker Compose con imagen `postgres:18-alpine3.22`
- **T002 - Next.js**: Entorno completo configurado
  - ✅ Next.js 15.5.6 + React 19.1.0 + TypeScript
  - ✅ Tailwind CSS 4 configurado
  - ✅ Variables de entorno (.env.example y .env.local)
  - ✅ Estructura de directorios para auth
  - ✅ Tipos TypeScript completos
  - ✅ Configuración centralizada
- **T003 - Esquema de BD**: Base de datos completamente configurada
  - ✅ 7 tablas creadas con constraints y validaciones
  - ✅ Índices optimizados para rendimiento
  - ✅ Función uuidv7() verificada y funcionando
  - ✅ Triggers automáticos para updated_at
- **T004 - Migraciones**: Sistema de migraciones con Drizzle ORM configurado
  - ✅ Drizzle ORM instalado y configurado
  - ✅ Esquemas TypeScript equivalentes al SQL
  - ✅ Migración inicial generada y validada
  - ✅ Scripts de BD y utilidades completas
  - ✅ Queries tipadas y conexión lazy loading
- **T005 - Seeders**: Datos iniciales poblados
  - ✅ 16 permisos base en 3 módulos
  - ✅ 3 roles predefinidos con permisos asignados
  - ✅ Super Administrador con todos los permisos

- **T018 - shadcn/ui**: Configuración completada
  - ✅ `components.json` configurado con estilo "new-york"
  - ✅ Lucide icons y dependencias base instaladas
  - ✅ Tema "Blue" configurado según ADR-001
  - ✅ CSS variables actualizadas con colores blue en light/dark mode

- **T006 - Auth.js**: Sistema de autenticación configurado
  - ✅ Auth.js v5 instalado (migrado desde Lucia Auth deprecado)
  - ✅ Drizzle adapter configurado para PostgreSQL
  - ✅ Credentials provider para email/password
  - ✅ Configuración personalizada para RBAC
  - ✅ API routes configurados (/api/auth/[...nextauth])
  - ✅ Middleware de protección de rutas implementado

- **T007 - Tipos TypeScript**: Sistema de tipos completo
  - ✅ Tipos extendidos para Auth.js (Session, User)
  - ✅ Interfaces para RBAC (UserRole, Permission)
  - ✅ Tipos de autenticación (Login, Register, etc.)
  - ✅ Hooks personalizados para React (useAuth, usePermission)
  - ✅ Utilidades de autenticación y gestión de usuarios
  - ✅ Schema de BD actualizado para compatibilidad Auth.js

### ⏳ Próximas Tareas Prioritarias
1. **T008**: Implementación de registro de usuarios
2. **T009**: Implementación de login/logout con Auth.js
3. **T010**: Middleware de autenticación

### 📊 Progreso General
- **Horas ahorradas**: 34h (T001-T007 + T018 completados)
- **Estimación revisada**: 203h → **159h (~4.0 semanas)**
- **Fase 1 progreso**: 5/5 tareas (100% completado) ✅
- **Fase 2 progreso**: 2/6 tareas (T006, T007 completados) ✅
- **Fase 4 progreso**: 1/6 tareas (T018 completado) ✅
- **Migración exitosa**: Lucia Auth → Auth.js por deprecación

---

**Próxima Revisión:** Al completar cada fase
**Responsable del Plan:** Equipo de Desarrollo
**Última Actualización:** 2025-10-29