# Checklist de Validación de Arquitectura
# Módulo de Notificaciones - Aurora Nova

> **Propósito:** Validar que la implementación cumple con las decisiones de arquitectura documentadas.
> **Usar en:** Code reviews, validación de PRs, auditorías técnicas

---

## 📋 Decisiones de Arquitectura (ADRs)

### ✅ ADR-001: Arquitectura Asíncrona con pg-boss

- [ ] **Motor de cola implementado:** Se usa pg-boss (no polling manual, no Redis)
- [ ] **Configuración de schema:** Tablas de pg-boss en schema `public` con prefijo `pgboss_*`
- [ ] **Arquitectura híbrida:**
  - [ ] Tabla `notification_events` existe y se usa para auditoría
  - [ ] Tablas de pg-boss existen y se usan para procesamiento
  - [ ] Flujo correcto: INSERT en `notification_events` → `boss.send()` → Worker procesa → UPDATE `notification_events`
- [ ] **Reintentos configurados:** pg-boss tiene exponential backoff (max 5 intentos)
- [ ] **Dead letter queue:** Jobs que fallan 5 veces se mueven a DLQ
- [ ] **Sin infraestructura adicional:** No se usa Redis ni servicios externos de cola

### ✅ ADR-002: Worker como Aplicación Independiente

- [ ] **Worker es aplicación separada:** Existe directorio `notification-worker/` con su propio `package.json`
- [ ] **Contenedores independientes:** docker-compose tiene servicios separados `web` y `worker`
- [ ] **Worker es Node.js standalone:**
  - [ ] `package.json` del worker NO incluye `express`
  - [ ] `package.json` del worker NO incluye `next`
  - [ ] `package.json` del worker SÍ incluye: `pg-boss`, `@prisma/client`, `nodemailer`, `mustache`, `pino`
- [ ] **Worker NO expone HTTP:**
  - [ ] No hay `app.listen()` en el código
  - [ ] No hay endpoints HTTP definidos
  - [ ] docker-compose NO expone puertos para el worker
- [ ] **Entry point correcto:** Worker ejecuta `node dist/index.js` (proceso long-running)
- [ ] **Graceful shutdown:** Worker escucha SIGTERM/SIGINT y llama a `boss.stop()`

---

## 🗄️ Base de Datos

### Modelos Prisma

- [ ] **NotificationTemplate existe:**
  - [ ] Campos: `id`, `name`, `type`, `subject`, `body`, `createdAt`, `updatedAt`
  - [ ] `name` es unique
  - [ ] `type` es enum o string validado ('EMAIL', 'SMS', 'PUSH')
- [ ] **NotificationEvent existe:**
  - [ ] Campos: `id`, `eventName`, `channel`, `payload` (JSON), `status`, `attempts`, `sentAt`, `createdAt`
  - [ ] Índices en: `status`, `eventName`, `createdAt`
  - [ ] `status` tiene valores: 'PENDING', 'SENT', 'FAILED'

### Migraciones

- [ ] **Migración creada:** Tablas de notificaciones existen en BD
- [ ] **Tablas de pg-boss creadas:** `pgboss_job`, `pgboss_archive`, etc. existen
- [ ] **Seeds opcionales:** Al menos una plantilla de ejemplo (`password-reset-v1`)

---

## 🔄 Publicación de Eventos (application-base)

### NotificationPublisher Service

- [ ] **Servicio existe:** `src/services/notification-publisher.ts` o similar
- [ ] **Método `publishNotificationEvent()`:**
  - [ ] Recibe: `eventName`, `channel`, `payload`
  - [ ] Inserta en `notification_events` con `status: 'PENDING'`
  - [ ] Llama a `boss.send('notification.{channel}', data)`
  - [ ] Ambas operaciones son transaccionales (o maneja errores correctamente)
- [ ] **Configuración de pg-boss:**
  - [ ] Inicializado con `DATABASE_URL`
  - [ ] Schema configurado correctamente
  - [ ] Singleton o gestión correcta de instancia

### Integración en Flujos

- [ ] **`requestPasswordReset()` refactorizado:**
  - [ ] NO envía email directamente
  - [ ] Llama a `publishNotificationEvent()`
  - [ ] Responde inmediatamente al usuario (sin esperar envío)
- [ ] **Otros flujos integrados:** (si aplica)
  - [ ] Bienvenida de usuario
  - [ ] Verificación de email
  - [ ] Notificaciones transaccionales

---

## 🏗️ Worker (notification-worker)

### Estructura de Proyecto

- [ ] **Entry point (`src/index.ts`):**
  - [ ] Importa PgBoss
  - [ ] Llama a `boss.start()`
  - [ ] Registra handlers con `boss.work()`
  - [ ] Implementa graceful shutdown
  - [ ] NO crea servidor HTTP
- [ ] **Configuración (`src/config/pgboss.ts`):**
  - [ ] Opciones de reintentos (exponential backoff)
  - [ ] Dead letter queue habilitado
  - [ ] Configuración de schema
- [ ] **Handlers (`src/handlers/`):**
  - [ ] `email.ts` implementado
  - [ ] Handlers adicionales (SMS, PUSH) preparados o implementados
  - [ ] `index.ts` exporta todos los handlers

### Handler de Email

- [ ] **Implementación completa:**
  - [ ] 1. Fetch template de BD (por `eventName`)
  - [ ] 2. Renderiza con Mustache usando `payload`
  - [ ] 3. Envía email vía nodemailer
  - [ ] 4. Actualiza `notification_events.status` a 'SENT' o 'FAILED'
- [ ] **Manejo de errores:**
  - [ ] Errores logueados con pino (contexto completo)
  - [ ] Lanza error para que pg-boss reintente
  - [ ] No swallow exceptions

### Services

- [ ] **Template Service (`src/services/template.ts`):**
  - [ ] Fetch template por nombre y tipo
  - [ ] Renderiza template con Mustache
  - [ ] Validación de variables requeridas (opcional)
- [ ] **Mailer Service (`src/services/mailer.ts`):**
  - [ ] Wrapper de nodemailer configurado
  - [ ] Configuración SMTP desde env vars
  - [ ] Manejo de errores transitorios vs permanentes

### Logging

- [ ] **Pino configurado:**
  - [ ] Formato JSON estructurado
  - [ ] Logs de: inicio, shutdown, jobs procesados, errores
  - [ ] Contexto incluye: jobId, eventName, channel, duration
- [ ] **Niveles apropiados:**
  - [ ] `info` para jobs exitosos
  - [ ] `warn` para reintentos
  - [ ] `error` para fallos

---

## 🐳 Containerización y Deployment

### Docker

- [ ] **Dockerfile del worker:**
  - [ ] Multi-stage build (builder + runtime)
  - [ ] Stage runtime solo con dependencias de producción
  - [ ] CMD ejecuta: `node dist/index.js`
  - [ ] Variables de entorno configurables
- [ ] **docker-compose.yml:**
  - [ ] Servicio `web` (application-base)
  - [ ] Servicio `worker` (notification-worker)
  - [ ] Servicio `db` (PostgreSQL)
  - [ ] Worker NO expone puertos
  - [ ] Worker tiene `depends_on: [db]`
  - [ ] Worker tiene `restart: always`

### Health Checks

- [ ] **Script de health check (`scripts/health-check.ts`):**
  - [ ] NO usa HTTP
  - [ ] Verifica que pg-boss está running
  - [ ] Verifica conexión a BD
  - [ ] Retorna exit code 0 (healthy) o 1 (unhealthy)
- [ ] **Docker healthcheck configurado:**
  - [ ] `test: ["CMD", "node", "dist/scripts/health-check.js"]`
  - [ ] `interval: 30s`
  - [ ] `retries: 3`

### Variables de Entorno

- [ ] **`.env.example` existe en worker:**
  - [ ] `DATABASE_URL`
  - [ ] `SMTP_HOST`
  - [ ] `SMTP_PORT`
  - [ ] `SMTP_USER`
  - [ ] `SMTP_PASS`
  - [ ] `NODE_ENV`
  - [ ] `WORKER_CONCURRENCY` (opcional)

---

## 📊 Monitoreo y Observabilidad

### Métricas

- [ ] **Consulta de métricas implementada:**
  - [ ] Función para obtener tamaño de cola (`boss.getQueueSize()`)
  - [ ] Función para obtener jobs fallidos
  - [ ] Opcionalmente expuesto en application-base para dashboard admin

### Logs

- [ ] **Logs accesibles:**
  - [ ] `docker-compose logs worker` funciona
  - [ ] Logs en formato JSON (parseable)
  - [ ] Logs incluyen contexto suficiente para debugging

### Alertas (Documentadas)

- [ ] **Condiciones de alerta definidas:**
  - [ ] Worker down >5min
  - [ ] Tasa de fallos >10%
  - [ ] Cola >1000 jobs pendientes
  - [ ] Latencia promedio >30s

---

## 🧪 Testing

### Tests de Integración

- [ ] **Test: Publicar evento desde web:**
  - [ ] Verifica INSERT en `notification_events`
  - [ ] Verifica job creado en pg-boss
- [ ] **Test: Worker procesa evento:**
  - [ ] Verifica email enviado (mock de SMTP)
  - [ ] Verifica UPDATE en `notification_events` (status: 'SENT')
- [ ] **Test: Reintentos en fallos:**
  - [ ] Simula fallo SMTP
  - [ ] Verifica que pg-boss reintenta
  - [ ] Verifica exponential backoff

### Tests de Deployment

- [ ] **Test: `docker-compose up` exitoso:**
  - [ ] Todos los servicios inician correctamente
  - [ ] Worker conecta a BD
  - [ ] Worker registra handlers
  - [ ] No hay errores en logs
- [ ] **Test: Health check funciona:**
  - [ ] `docker exec worker npm run health` retorna 0
  - [ ] Docker healthcheck marca worker como healthy
- [ ] **Test: Escalado de workers:**
  - [ ] `docker-compose up --scale worker=3` funciona
  - [ ] Jobs se distribuyen entre workers
  - [ ] Sin procesamiento duplicado

### Tests de Graceful Shutdown

- [ ] **Test: SIGTERM durante procesamiento:**
  - [ ] Worker completa job en progreso
  - [ ] Worker no acepta nuevos jobs
  - [ ] Worker cierra conexiones correctamente
  - [ ] Exit code 0

---

## 📚 Documentación

### Documentación Técnica

- [ ] **README.md actualizado:**
  - [ ] Arquitectura técnica explicada
  - [ ] Stack tecnológico listado
  - [ ] Flujo de procesamiento documentado
  - [ ] Comandos de desarrollo incluidos
  - [ ] Guía de deployment
- [ ] **ADRs completos:**
  - [ ] ADR-001 (Arquitectura Asíncrona)
  - [ ] ADR-002 (Worker Independiente)
- [ ] **implementation-plan.md actualizado:**
  - [ ] 7 fases definidas
  - [ ] 32 tareas detalladas
  - [ ] Dependencias claras

### Código Documentado

- [ ] **Comentarios en código crítico:**
  - [ ] Entry point del worker
  - [ ] Configuración de pg-boss
  - [ ] Handlers con ejemplos de payload
  - [ ] Funciones complejas
- [ ] **README en notification-worker/:**
  - [ ] Cómo ejecutar localmente
  - [ ] Variables de entorno requeridas
  - [ ] Comandos útiles

---

## ✅ Validación Final

### Checklist de Producción-Ready

- [ ] Todos los items de "Decisiones de Arquitectura" ✅
- [ ] Todos los items de "Base de Datos" ✅
- [ ] Todos los items de "Publicación de Eventos" ✅
- [ ] Todos los items de "Worker" ✅
- [ ] Todos los items de "Containerización" ✅
- [ ] Todos los items de "Monitoreo" ✅
- [ ] Todos los items de "Testing" ✅
- [ ] Todos los items de "Documentación" ✅

### Validación de Arquitectura Standalone

- [ ] ✅ Worker NO usa Express.js
- [ ] ✅ Worker NO usa Next.js
- [ ] ✅ Worker NO expone endpoints HTTP
- [ ] ✅ Worker NO tiene `app.listen()` en el código
- [ ] ✅ docker-compose NO expone puertos para worker
- [ ] ✅ Health checks son scripts standalone (exit codes)
- [ ] ✅ Métricas se consultan vía código (no vía HTTP)

---

## 🚨 Red Flags (Señales de Alerta)

Si encuentras alguno de estos, la implementación **NO cumple con la arquitectura**:

- ❌ `import express from 'express'` en notification-worker
- ❌ `import next from 'next'` en notification-worker
- ❌ `app.listen(3001)` en worker
- ❌ Endpoints HTTP en worker (`app.get('/health')`)
- ❌ `ports: ["3001:3001"]` para worker en docker-compose
- ❌ Polling manual con `setInterval()` en lugar de pg-boss
- ❌ Redis en stack tecnológico
- ❌ Worker accede directamente a servicios externos sin usar handlers
- ❌ Email enviado sincrónicamente desde Server Actions
- ❌ Tabla `notification_events` no se usa (solo pg-boss)

---

## 📝 Notas de Revisión

**Revisor:**  _____________
**Fecha:**     _____________
**Versión:**   _____________

**Items que NO cumplen:**
- [ ] _______________________
- [ ] _______________________

**Comentarios adicionales:**

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Aprobado para Producción:** [ ] Sí  [ ] No  [ ] Con observaciones

---

**Próximo paso:** Si todos los items están ✅, proceder con deployment a staging/producción.
