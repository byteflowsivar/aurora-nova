# ADR-002: Worker como Aplicación Independiente

- **Estado:** Aceptado
- **Fecha:** 2025-11-11
- **Relacionado:** ADR-001 (Arquitectura Asíncrona)

## 1. Contexto

El Módulo de Notificaciones requiere un proceso worker de larga duración para procesar eventos de forma asíncrona (ver ADR-001). Este worker debe:
*   Ejecutarse de forma continua (long-running process)
*   Procesar jobs de pg-boss sin interrupciones
*   Ser escalable horizontalmente si el volumen de notificaciones crece
*   No interferir con los deployments de la aplicación web Next.js

**Naturaleza del Worker:**
El worker es un **proceso Node.js standalone** (no un servidor web). No necesita framework web (ni Express.js ni Next.js) porque:
- No expone endpoints HTTP
- No sirve contenido estático
- Solo consume jobs de pg-boss y ejecuta handlers
- La comunicación es unidireccional: lee de la cola, procesa, actualiza BD

### Opciones Evaluadas

**Opción A: Worker dentro del contenedor de Next.js (Monolito)**
*   Usar PM2 u otro process manager para ejecutar Next.js y el worker en el mismo contenedor
*   Un solo Dockerfile, un solo proceso de deployment

**Opción B: Worker como aplicación separada (Servicios Separados)**
*   Worker en su propio contenedor Docker
*   docker-compose orquestando múltiples servicios (web, worker, db)
*   Deployments independientes

## 2. Decisión

Se ha decidido implementar el worker como una **aplicación independiente** ejecutándose en su propio contenedor Docker, separado de la aplicación web Next.js.

### Razones de la Decisión

1.  **Ciclos de Vida Independientes:**
    *   La aplicación web puede reiniciarse (deployments, updates) sin afectar el procesamiento de notificaciones
    *   El worker puede actualizarse sin downtime de la web
    *   Los fallos de uno no afectan directamente al otro

2.  **Escalabilidad Horizontal:**
    *   El worker puede escalarse independientemente según el volumen de notificaciones
    *   La web puede escalarse según el tráfico de usuarios
    *   Ejemplo: 2 instancias web + 5 instancias worker

3.  **Gestión de Recursos:**
    *   El worker puede tener límites de memoria/CPU diferentes a la web
    *   Permite monitorear recursos consumidos por cada componente por separado
    *   Optimización de costos al escalar solo lo necesario

4.  **Debugging y Observabilidad:**
    *   Logs separados y más fáciles de analizar
    *   Health checks independientes
    *   Métricas específicas para cada servicio

5.  **Deployment Selectivo:**
    *   Cambios en la UI/lógica web no requieren redeploy del worker
    *   Cambios en lógica de notificaciones no afectan la web
    *   Rollbacks independientes

### Arquitectura de Despliegue

```
┌──────────────────────────────────────┐
│  Container: application-base (web)   │
│                                      │
│  ┌────────────────────────┐         │
│  │  Next.js App           │         │
│  │  HTTP Server (Port 3000)         │
│  └────────────────────────┘         │
│                                      │
│  • Sirve UI y API routes            │
│  • Publica eventos en pg-boss       │
│  • Inserta en notification_events   │
└──────────────────────────────────────┘
         │
         ↓ (via PostgreSQL/pg-boss)
┌──────────────────────────────────────┐
│  Container: notification-worker      │
│  (Node.js Standalone - Sin HTTP)     │
│                                      │
│  ┌────────────────────────┐         │
│  │  node dist/index.js    │         │
│  │  - pg-boss.start()     │         │
│  │  - boss.work(handlers) │         │
│  │  - Proceso long-running│         │
│  └────────────────────────┘         │
│                                      │
│  • NO expone puertos HTTP           │
│  • Consume jobs de pg-boss          │
│  • Envía notificaciones             │
│  • Actualiza notification_events    │
└──────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Container: PostgreSQL               │
│                                      │
│  • Tablas de negocio                │
│  • notification_events              │
│  • notification_templates           │
│  • Tablas de pg-boss (pgboss_*)     │
└──────────────────────────────────────┘
```

### Estructura de Proyecto

```
aurora-nova/
├── application-base/                # Aplicación web Next.js
│   ├── src/
│   ├── Dockerfile
│   └── package.json                 # Incluye: next, react, pg-boss (publisher)
│
├── notification-worker/             # Worker standalone (Node.js puro)
│   ├── src/
│   │   ├── index.ts                # Entry point - Inicializa pg-boss
│   │   ├── config/
│   │   │   └── pgboss.ts           # Configuración de reintentos, etc.
│   │   ├── handlers/
│   │   │   ├── email.ts            # Handler de canal EMAIL
│   │   │   ├── sms.ts              # Handler de canal SMS (futuro)
│   │   │   └── index.ts            # Exporta handlers
│   │   ├── services/
│   │   │   ├── template.ts         # Fetch y renderizado
│   │   │   └── mailer.ts           # Wrapper de nodemailer
│   │   └── utils/
│   │       └── logger.ts           # Configuración de pino
│   ├── scripts/
│   │   └── health-check.ts         # Health check (sin HTTP)
│   ├── Dockerfile                  # Multi-stage build
│   └── package.json                # Solo: pg-boss, prisma, nodemailer, pino
│                                   # SIN: express, next, frameworks web
│
└── docker-compose.yml              # Orquestación completa
```

**Nota crítica:** El worker NO incluye frameworks web en sus dependencias. Es un proceso long-running que ejecuta `node dist/index.js` y permanece activo consumiendo jobs.

## 3. Consecuencias

### Positivas

*   **Alta Disponibilidad:** El worker continúa procesando notificaciones durante deployments de la web.
*   **Escalabilidad Precisa:** Se puede escalar cada componente según sus necesidades específicas.
*   **Aislamiento de Fallos:** Un crash del worker no afecta a la web y viceversa.
*   **Logs Claros:** Cada contenedor tiene sus propios logs, facilitando debugging.
*   **Deployment Flexible:** Posibilidad de hacer rollbacks independientes.
*   **Optimización de Recursos:** Asignación de recursos específica para cada workload.

### Negativas

*   **Mayor Complejidad Operacional:** Requiere orquestar múltiples contenedores (docker-compose o Kubernetes).
*   **Más Overhead:** Dos contenedores Node.js en lugar de uno consume más memoria base.
*   **CI/CD Más Complejo:** Dos pipelines de build o lógica condicional para builds.
*   **Configuración Inicial:** Más setup inicial comparado con un monolito.
*   **Gestión de Versiones:** Necesidad de versionado y compatibilidad entre web y worker.

### Mitigaciones

*   **docker-compose:** Simplifica la orquestación local y en VPS.
*   **Shared Types:** Usar un package compartido de tipos TypeScript entre web y worker.
*   **Versionado Semántico:** Establecer contratos claros de API entre componentes.
*   **Health Checks:** Implementar health checks para monitorear ambos servicios.

## 4. Alternativas Consideradas

### Monolito con PM2
**Ventajas:** Simplicidad inicial, un solo contenedor.
**Desventajas:** Acopla ciclos de vida, dificulta escalado independiente.
**Razón de Descarte:** Limitaciones de escalabilidad y deployment.

### Serverless Functions (Vercel Cron)
**Ventajas:** Sin gestión de infraestructura.
**Desventajas:** Límites de ejecución, solo funciona en Vercel, no es real-time.
**Razón de Descarte:** Deployment previsto es en VPS propio.

### Servicios Externos (Inngest, Trigger.dev)
**Ventajas:** UI visual, retries incluidos, excelente DX.
**Desventajas:** Dependencia externa, costos, vendor lock-in.
**Razón de Descarte:** Preferencia por solución self-hosted y control total.

## 5. Estrategia de Implementación

### Fase 1: Desarrollo Local
*   Crear estructura básica de `notification-worker/`
*   Configurar docker-compose.yml con ambos servicios
*   Validar comunicación vía pg-boss

### Fase 2: Configuración de Producción
*   Crear Dockerfiles optimizados (multi-stage builds)
*   Configurar variables de entorno por servicio
*   Setup de health checks y logging

### Fase 3: Despliegue en VPS
*   Deployment con docker-compose en VPS
*   Configuración de reverse proxy (Nginx) para web
*   Monitoreo de salud de worker

### Fase 4: Escalado (Futuro)
*   Migración a Docker Swarm o Kubernetes si es necesario
*   Configuración de auto-scaling basado en métricas
*   Load balancing para múltiples workers

## 6. Referencias

*   [pg-boss Documentation](https://github.com/timgit/pg-boss)
*   [Docker Multi-Container Apps](https://docs.docker.com/compose/)
*   [The Twelve-Factor App - Backing Services](https://12factor.net/backing-services)
