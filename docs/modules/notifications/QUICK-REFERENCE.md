# Módulo de Notificaciones - Referencia Rápida

> **Última actualización:** 2025-11-11
> **Estado:** ✅ Arquitectura definida y documentada

---

## 🎯 Decisiones Clave de Arquitectura

### Motor de Cola: pg-boss
- ✅ Usa PostgreSQL (sin Redis)
- ✅ Reintentos automáticos con exponential backoff
- ✅ Dead letter queue incluido
- ✅ Locking distribuido para múltiples workers
- ✅ Tablas en schema `public` con prefijo `pgboss_*`

### Worker: Node.js Standalone
- ✅ **NO usa Express.js**
- ✅ **NO usa Next.js**
- ✅ **NO expone endpoints HTTP**
- ✅ Proceso long-running: `node dist/index.js`
- ✅ Solo ejecuta pg-boss con handlers

### Arquitectura Híbrida
- **`notification_events`**: Tabla de auditoría (historial de negocio)
- **Tablas `pgboss_*`**: Motor de cola (procesamiento transaccional)

---

## 📦 Stack Tecnológico

### Application-base (Web)
```json
{
  "dependencies": {
    "next": "15.5.6",
    "pg-boss": "^9.0.3",      // Publisher
    "@prisma/client": "^6.18.0"
  }
}
```

### Notification-worker (Worker)
```json
{
  "dependencies": {
    "pg-boss": "^9.0.3",       // Consumer
    "@prisma/client": "^6.18.0",
    "nodemailer": "^7.0.10",
    "mustache": "^4.2.0",
    "pino": "^10.1.0"
  }
  // SIN: express, next
}
```

---

## 🏗️ Estructura de Proyecto

```
aurora-nova/
├── application-base/              # Next.js web app
│   ├── src/
│   │   └── services/
│   │       └── notification-publisher.ts  # Publica eventos
│   └── package.json              # Incluye pg-boss (publisher)
│
├── notification-worker/          # Node.js standalone
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── config/
│   │   │   └── pgboss.ts
│   │   ├── handlers/
│   │   │   ├── email.ts          # Handler EMAIL
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── template.ts
│   │   │   └── mailer.ts
│   │   └── utils/
│   │       └── logger.ts
│   ├── scripts/
│   │   └── health-check.ts       # Sin HTTP
│   ├── Dockerfile
│   └── package.json              # Solo pg-boss, prisma, nodemailer
│
└── docker-compose.yml
```

---

## 🔄 Flujo de Procesamiento

### 1. Publicación (Application-base)
```typescript
// Server Action en Next.js
async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  const token = generateResetToken();

  // Publica evento (RÁPIDO - <50ms)
  await publishNotificationEvent(
    'user.password_reset.requested',
    'EMAIL',
    {
      userId: user.id,
      email: user.email,
      resetToken: token,
      resetUrl: `https://app.com/reset?token=${token}`
    }
  );

  return { success: true }; // Respuesta inmediata al usuario
}

// notification-publisher.ts
async function publishNotificationEvent(eventName, channel, payload) {
  // 1. Auditoría
  await prisma.notificationEvent.create({
    data: { eventName, channel, payload, status: 'PENDING' }
  });

  // 2. Cola de procesamiento
  await boss.send(`notification.${channel}`, { eventName, payload });
}
```

### 2. Procesamiento (Notification-worker)
```typescript
// notification-worker/src/index.ts
import PgBoss from 'pg-boss';
import { emailHandler } from './handlers/email';

async function main() {
  const boss = new PgBoss(process.env.DATABASE_URL);
  await boss.start();

  // Registrar handlers
  await boss.work('notification.EMAIL', emailHandler);

  console.log('Worker started and listening...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await boss.stop();
    process.exit(0);
  });
}

main();
```

```typescript
// notification-worker/src/handlers/email.ts
export async function emailHandler(job: Job) {
  const { eventName, payload } = job.data;

  // 1. Fetch template
  const template = await prisma.notificationTemplate.findFirst({
    where: { name: `${eventName}-v1`, type: 'EMAIL' }
  });

  // 2. Render
  const html = Mustache.render(template.body, payload);

  // 3. Send
  await transporter.sendMail({
    to: payload.email,
    subject: template.subject,
    html
  });

  // 4. Update audit log
  await prisma.notificationEvent.updateMany({
    where: { eventName, status: 'PENDING' },
    data: { status: 'SENT', sentAt: new Date() }
  });
}
```

---

## 🐳 Docker Compose

```yaml
version: '3.8'

services:
  web:
    build:
      context: ./application-base
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/aurora
    depends_on:
      - db

  worker:
    build:
      context: ./notification-worker
    # NO PORTS - No expone HTTP
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/aurora
      - SMTP_HOST=smtp.gmail.com
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    depends_on:
      - db
    restart: always
    healthcheck:
      test: ["CMD", "node", "dist/scripts/health-check.js"]
      interval: 30s
      timeout: 5s
      retries: 3

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aurora
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 🗄️ Modelos Prisma

```prisma
model NotificationTemplate {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  name      String   @unique @db.VarChar(100)  // "password-reset-v1"
  type      String   @db.VarChar(20)           // "EMAIL", "SMS", "PUSH"
  subject   String?  @db.VarChar(255)          // Para EMAIL
  body      String                             // Template Mustache
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("notification_template")
}

model NotificationEvent {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  eventName String   @map("event_name") @db.VarChar(100)
  channel   String   @db.VarChar(20)        // "EMAIL", "SMS", "PUSH"
  payload   Json                            // Datos para la plantilla
  status    String   @default("PENDING")    // PENDING, SENT, FAILED
  attempts  Int      @default(0)
  sentAt    DateTime? @map("sent_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("notification_event")
  @@index([status])
  @@index([eventName])
  @@index([createdAt])
}
```

---

## 🚀 Comandos de Desarrollo

### Setup Inicial
```bash
# 1. Instalar dependencias
cd application-base && npm install
cd ../notification-worker && npm install

# 2. Configurar .env
cp .env.example .env

# 3. Migraciones
cd application-base
npm run db:migrate
```

### Ejecutar Localmente
```bash
# Opción A: Docker Compose (Recomendado)
docker-compose up

# Opción B: Procesos separados
# Terminal 1: DB
docker-compose up db

# Terminal 2: Web
cd application-base && npm run dev

# Terminal 3: Worker
cd notification-worker && npm run dev
```

### Health Check
```bash
# Verificar salud del worker
docker exec notification-worker npm run health

# O manualmente
docker exec notification-worker node dist/scripts/health-check.js
echo $?  # 0 = healthy, 1 = unhealthy
```

### Escalar Workers
```bash
# Ejecutar 3 instancias en paralelo
docker-compose up --scale worker=3
```

---

## 📊 Métricas y Monitoreo

### Consultar Métricas (desde código)
```typescript
// En application-base o worker
const queueSize = await boss.getQueueSize('notification.EMAIL');
console.log(`Pending jobs: ${queueSize}`);

const failed = await boss.getQueueSize('notification.EMAIL', { state: 'failed' });
console.log(`Failed jobs: ${failed}`);
```

### Logs del Worker
```bash
# Ver logs en tiempo real
docker-compose logs -f worker

# Logs estructurados (JSON)
docker-compose logs worker | jq '.msg'
```

### Alertas Recomendadas
| Condición | Acción |
|-----------|--------|
| Worker down >5min | Reiniciar servicio |
| Tasa de fallos >10% | Revisar logs de errores |
| Cola >1000 jobs | Escalar workers |

---

## 🔧 Extensibilidad

### Añadir Nuevo Canal (ej. SMS)

**1. Crear Handler**
```typescript
// notification-worker/src/handlers/sms.ts
export async function smsHandler(job: Job) {
  const { payload } = job.data;
  // Lógica de envío SMS con Twilio/AWS SNS
}
```

**2. Registrar Handler**
```typescript
// notification-worker/src/index.ts
await boss.work('notification.SMS', smsHandler);
```

**3. Publicar Evento**
```typescript
// application-base
await publishNotificationEvent(
  'user.sms_verification',
  'SMS',  // ← Nuevo canal
  { phoneNumber: '+1234567890', code: '123456' }
);
```

**Sin cambios en infraestructura.** ✅

---

## 📚 Documentación Completa

- **README.md** - Visión general y arquitectura técnica
- **ADR-001** - Arquitectura asíncrona con pg-boss
- **ADR-002** - Worker como aplicación independiente
- **use-cases.md** - Casos de uso y requerimientos
- **implementation-plan.md** - Plan de implementación (7 fases, 32 tareas)

---

## ✅ Checklist Pre-Implementación

- [ ] PostgreSQL 16+ instalado o disponible vía Docker
- [ ] Node.js 20+ instalado
- [ ] Docker y docker-compose instalados
- [ ] Credenciales SMTP configuradas (Gmail, SendGrid, etc.)
- [ ] Variables de entorno configuradas (`.env`)
- [ ] Equipo alineado en arquitectura pg-boss + worker standalone
- [ ] Confirmado: Worker NO usará Express/Next.js

---

## 🎯 Próximos Pasos

1. **Fase 0**: Crear estructura del proyecto `notification-worker/`
2. **Fase 1**: Crear modelos Prisma y migraciones
3. **Fase 2**: Implementar `NotificationPublisher` en application-base
4. **Fase 3**: Implementar worker con handlers
5. **Fase 4**: Admin UI para gestión de plantillas
6. **Fase 5**: Docker y deployment
7. **Fase 6**: Monitoreo y observabilidad
8. **Fase 7**: Testing y validación

**Tiempo estimado:** 2-3 semanas para MVP funcional

---

## 💡 Puntos Críticos a Recordar

1. ✅ El worker es **Node.js standalone** (sin frameworks web)
2. ✅ Usa **arquitectura híbrida** (notification_events + pg-boss)
3. ✅ Health checks **sin HTTP** (scripts standalone)
4. ✅ pg-boss maneja **locking y reintentos** automáticamente
5. ✅ Escalado **horizontal** simplemente levantando más workers
6. ✅ **Sin Redis**, todo en PostgreSQL

---

**¿Preguntas frecuentes?**

**Q: ¿El worker necesita Express para health checks?**
**A:** No. Los health checks son scripts que retornan exit codes (0/1).

**Q: ¿Cómo escalo el worker?**
**A:** `docker-compose up --scale worker=N` - pg-boss distribuye automáticamente.

**Q: ¿Qué pasa si un worker crashea durante un job?**
**A:** pg-boss reintenta automáticamente (exponential backoff).

**Q: ¿Puedo ver métricas en tiempo real?**
**A:** Sí, consulta `boss.getQueueSize()` desde application-base o worker.

**Q: ¿El worker comparte código con application-base?**
**A:** Puede compartir tipos TypeScript, pero son proyectos independientes.
