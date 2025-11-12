# Módulo: Notificaciones

- **Estado:** 📝 En Planificación

## Visión General

El Módulo de Notificaciones proporciona una infraestructura centralizada, reutilizable y resiliente para enviar comunicaciones a los usuarios, comenzando con correos electrónicos.

Está diseñado con una **arquitectura asíncrona y orientada a eventos** para desacoplar el envío de notificaciones de la lógica de negocio principal. Esto asegura que las acciones del usuario (como registrarse o solicitar un reinicio de contraseña) sean rápidas y no se vean bloqueadas o fallidas por problemas en el sistema de envío de correos.

### Características Principales

*   **Asincronía:** Las notificaciones se procesan en segundo plano usando **pg-boss**, mejorando la experiencia de usuario.
*   **Gestión de Plantillas:** El contenido de las notificaciones se gestiona desde la base de datos, permitiendo cambios sin necesidad de un nuevo despliegue.
*   **Extensibilidad Multi-Canal:** La arquitectura está diseñada para soportar múltiples canales de notificación (ej. `EMAIL`, `SMS`, `PUSH`). Un worker central actúa como despachador (dispatcher), facilitando la adición de nuevos canales en el futuro.
*   **Resiliencia:** Los fallos en el envío son manejados automáticamente por pg-boss con reintentos exponenciales y dead letter queue.
*   **Escalabilidad:** El worker se ejecuta como aplicación independiente, permitiendo escalar horizontalmente según demanda.
*   **Sin Infraestructura Adicional:** Usa PostgreSQL como backend de cola (no requiere Redis ni servicios externos).

---

## Arquitectura Técnica

### Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Motor de Cola** | pg-boss ^9.0.0 | Sistema de jobs asíncrono basado en PostgreSQL |
| **Base de Datos** | PostgreSQL 16+ | Almacenamiento de plantillas, eventos y cola de jobs |
| **Worker Runtime** | Node.js 20+ con TypeScript | Aplicación independiente que procesa notificaciones |
| **Renderizado de Plantillas** | Mustache.js | Interpolación de variables en plantillas de email |
| **Envío de Emails** | Nodemailer | Cliente SMTP para envío de correos |
| **Logging** | Pino | Logging estructurado en formato JSON |
| **Containerización** | Docker + docker-compose | Orquestación de servicios (web, worker, db) |

### Arquitectura de Componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                       APPLICATION-BASE (Web)                      │
│                                                                   │
│  ┌────────────────┐         ┌────────────────────────────────┐  │
│  │ Server Actions │────────▶│  NotificationPublisher         │  │
│  │ (Next.js)      │         │  - publishEvent()              │  │
│  └────────────────┘         │  - Inserta en notification_    │  │
│                             │    events (auditoría)          │  │
│                             │  - pg-boss.send()              │  │
│                             └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                      │
                                      │ pg-boss job queue
                                      ↓
┌──────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION-WORKER                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  pg-boss Consumer                                          │ │
│  │  - boss.work('notification.EMAIL', emailHandler)           │ │
│  │  - boss.work('notification.SMS', smsHandler)  [futuro]     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ↓                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Email        │  │ SMS Handler  │  │ Push Handler │          │
│  │ Handler      │  │  (Futuro)    │  │  (Futuro)    │          │
│  │              │  │              │  │              │          │
│  │ 1. Fetch     │  └──────────────┘  └──────────────┘          │
│  │    Template  │                                                │
│  │ 2. Render    │                                                │
│  │    (Mustache)│                                                │
│  │ 3. Send      │                                                │
│  │    (SMTP)    │                                                │
│  │ 4. Update    │                                                │
│  │    Event     │                                                │
│  └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
                                      │
                                      ↓
┌──────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL                                │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │ Tablas de Negocio    │    │ Tablas de pg-boss            │   │
│  │                      │    │                              │   │
│  │ - notification_      │    │ - pgboss_job                 │   │
│  │   templates          │    │ - pgboss_archive             │   │
│  │ - notification_      │    │ - pgboss_schedule            │   │
│  │   events (auditoría) │    │ - pgboss_subscription        │   │
│  │ - user, role, etc.   │    │ - pgboss_version             │   │
│  └──────────────────────┘    └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Flujo de Procesamiento

**Publicación de Evento (Aplicación Web):**

1. Usuario solicita reinicio de contraseña
2. Server Action `requestPasswordReset()` ejecuta
3. `NotificationPublisher.publishEvent()` realiza dos operaciones **atómicas**:
   - **INSERT** en `notification_events` (status: `PENDING`) → Auditoría
   - **pg-boss.send()** publica job `notification.EMAIL` → Cola de procesamiento
4. Respuesta inmediata al usuario (sin esperar envío)

**Procesamiento de Evento (Worker):**

1. Worker registrado con `boss.work('notification.EMAIL', emailHandler)`
2. pg-boss detecta job pendiente y lo asigna al worker (con locking automático)
3. `emailHandler()` ejecuta:
   - Busca plantilla en `notification_templates` por nombre
   - Renderiza plantilla con Mustache usando `payload`
   - Envía email vía SMTP (nodemailer)
   - Actualiza `notification_events.status` a `SENT` o `FAILED`
4. Si falla: pg-boss reintenta automáticamente (exponential backoff, max 5 intentos)
5. Si todos los reintentos fallan: mueve a dead letter queue

### Arquitectura Híbrida: Auditoría + Motor

Este diseño separa dos responsabilidades:

**`notification_events` (Tabla de Negocio):**
- Registro histórico **inmutable** de todos los eventos de notificación
- Usado para queries de negocio, compliance, debugging
- Indexado para búsquedas rápidas por usuario, fecha, canal
- Persiste indefinidamente

**Tablas de pg-boss (Motor Transaccional):**
- Cola de procesamiento **efímera** (jobs archivados después de completados)
- Maneja estados transitorios: pending, active, completed, failed
- Locking distribuido para múltiples workers
- Reintentos y dead letter queue
- Jobs antiguos eliminados automáticamente según retención configurada

---

## Desarrollo Local

### Prerequisitos

- Node.js 20+
- Docker y docker-compose
- PostgreSQL 16+ (o usar contenedor Docker)

### Setup Inicial

```bash
# 1. Instalar dependencias en application-base
cd application-base
npm install

# 2. Instalar dependencias en notification-worker
cd ../notification-worker
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de BD y SMTP

# 4. Ejecutar migraciones de BD
cd ../application-base
npm run db:migrate

# 5. (Opcional) Seed de plantillas iniciales
npm run db:seed
```

### Ejecutar en Desarrollo

**Opción A: Docker Compose (Recomendado)**

```bash
# Levanta web, worker y db simultáneamente
docker-compose up

# O en modo detached
docker-compose up -d

# Ver logs del worker específicamente
docker-compose logs -f worker
```

**Opción B: Procesos Separados (para debugging)**

```bash
# Terminal 1: Base de datos
docker-compose up db

# Terminal 2: Aplicación web
cd application-base
npm run dev

# Terminal 3: Worker
cd notification-worker
npm run dev
```

### Testing del Módulo

```bash
# Desde application-base
npm run test -- notifications

# Publicar evento de prueba (desde consola Node)
node
> const { publishNotificationEvent } = require('./dist/services/notification-publisher')
> await publishNotificationEvent('user.password_reset.requested', 'EMAIL', {
    userId: 'test-user-id',
    email: 'test@example.com',
    resetToken: 'abc123'
  })

# Verificar en logs del worker que procesa el evento
```

---

## Deployment en Producción

### VPS con Docker Compose

```bash
# 1. Clonar repositorio en VPS
git clone <repo-url> && cd aurora-nova

# 2. Configurar variables de entorno de producción
cp .env.example .env.production
# Editar con credenciales reales

# 3. Build y deploy
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Verificar salud del worker
docker-compose exec worker node scripts/health-check.js

# 5. Monitorear logs
docker-compose logs -f worker
```

### Escalar Workers

```bash
# Ejecutar 3 instancias del worker en paralelo
docker-compose up --scale worker=3 -d

# pg-boss distribuye automáticamente los jobs entre instancias
```

### Configuración de Nginx (Reverse Proxy)

```nginx
# Solo la aplicación web necesita ser expuesta
# El worker NO necesita puertos públicos

upstream nextjs_app {
  server localhost:3000;
}

server {
  listen 80;
  server_name tu-dominio.com;

  location / {
    proxy_pass http://nextjs_app;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## Monitoreo y Observabilidad

### Health Checks

```bash
# Verificar salud del worker
docker exec aurora-nova-worker node dist/scripts/health-check.js

# Salida esperada:
# ✓ pg-boss is running
# ✓ Database connection OK
# ✓ Last job processed: 2 minutes ago
```

### Métricas de pg-boss

```javascript
// Desde la aplicación web o worker
const metrics = await boss.getQueueSize('notification.EMAIL');
console.log(`Jobs pendientes: ${metrics}`);

const failed = await boss.getQueueSize('notification.EMAIL', { state: 'failed' });
console.log(`Jobs fallidos: ${failed}`);
```

### Logs Estructurados

El worker usa **pino** para logging estructurado:

```json
{
  "level": "info",
  "time": 1699564800000,
  "msg": "Job processed successfully",
  "jobId": "abc-123",
  "eventName": "user.password_reset.requested",
  "channel": "EMAIL",
  "duration": 245
}
```

### Alertas Recomendadas

| Métrica | Umbral | Acción |
|---------|--------|--------|
| Worker Down | >5 minutos | Reiniciar servicio |
| Tasa de Fallos | >10% | Investigar logs de errores |
| Cola Pendiente | >1000 jobs | Escalar workers |
| Latencia Promedio | >30 segundos | Optimizar handlers |

---

## Extensibilidad: Añadir Nuevos Canales

Para añadir un nuevo canal (ej. SMS):

**1. Crear Handler (notification-worker):**

```typescript
// src/handlers/smsHandler.ts
export async function smsHandler(job: Job<SMSPayload>) {
  // 1. Fetch template
  // 2. Render con Mustache
  // 3. Enviar vía Twilio/AWS SNS
  // 4. Update notification_events
}
```

**2. Registrar en Worker:**

```typescript
// src/index.ts
await boss.work('notification.SMS', smsHandler);
```

**3. Publicar desde Web:**

```typescript
// application-base
await publishNotificationEvent(
  'user.sms_verification.requested',
  'SMS',  // ← Nuevo canal
  { phoneNumber: '+1234567890', code: '123456' }
);
```

**No requiere cambios en la infraestructura base.** ✅

---
