# Deployment Guide - Aurora Nova v1.0.0

**Última actualización**: December 5, 2025

---

## 📋 Índice

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment en Vercel](#deployment-en-vercel)
3. [Deployment en Docker](#deployment-en-docker)
4. [Deployment en VPS (Ubuntu/DigitalOcean)](#deployment-en-vps)
5. [Deployment en Kubernetes](#deployment-en-kubernetes)
6. [Post-Deployment](#post-deployment)
7. [Monitoring y Logs](#monitoring-y-logs)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Código
- [ ] Rama `main` está limpia (no hay cambios sin commit)
- [ ] Build local compiló sin errores: `npm run build`
- [ ] Tests pasaron: `npm run test:run`
- [ ] Linting pasó: `npm run lint`
- [ ] No hay secrets en el código (usar `.env.local`)

### Documentación
- [ ] README.md actualizado con instrucciones de deployment
- [ ] RELEASE_NOTES.md completado con cambios de v1.0.0
- [ ] SECURITY.md revisado y actualizado
- [ ] CHANGELOG.md actualizado

### Dependencias
- [ ] `npm audit` sin vulnerabilidades críticas
- [ ] `npm update` ejecutado para parches
- [ ] `package-lock.json` versionado

### Base de Datos
- [ ] Backup de BD actual (si es migración)
- [ ] Script de migración probado en staging
- [ ] Seeds de datos iniciales listos
- [ ] Plan de rollback documentado

### Variables de Entorno
- [ ] `NEXTAUTH_SECRET` generado: `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` configurado correctamente
- [ ] `DATABASE_URL` apunta a BD de producción
- [ ] `LOG_LEVEL` configurado (recomendado: `info`)
- [ ] Todas las variables documentadas

### Seguridad
- [ ] HTTPS certificado válido
- [ ] Headers de seguridad configurados
- [ ] Rate limiting habilitado
- [ ] CORS configurado para dominios específicos
- [ ] Backups de BD programados

---

## 🚀 Deployment en Vercel

**Más fácil para Next.js. Recomendado para la mayoría de casos.**

### 1. Preparar el Repositorio

```bash
# Asegurate que estés en rama main
git checkout main
git pull origin main

# Commit y push final
git add .
git commit -m "chore(release): Prepare v1.0.0 for Vercel deployment"
git push origin main
```

### 2. Crear Cuenta en Vercel

- Ir a [vercel.com](https://vercel.com)
- Conectar repositorio de GitHub
- Autorizar Vercel

### 3. Crear Proyecto

1. Click en "Add New" → "Project"
2. Seleccionar repositorio
3. Framework: Detectará automáticamente Next.js
4. Build settings: Vercel sugiere automáticamente
5. Crear proyecto

### 4. Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
NEXTAUTH_URL=https://tuapp.vercel.app
NEXTAUTH_SECRET=<generado con openssl>
DATABASE_URL=postgresql://user:pass@host:5432/db
LOG_LEVEL=info
```

### 5. Crear Base de Datos

**Opción A: Neon (recomendado)**
- Ir a [neon.tech](https://neon.tech)
- Crear proyecto PostgreSQL
- Copiar `DATABASE_URL`
- Pegar en Vercel env vars

**Opción B: Railway (también bueno)**
- Ir a [railway.app](https://railway.app)
- Crear PostgreSQL project
- Conectar a Vercel

### 6. Deploy

1. Vercel automáticamente deploya en push a main
2. O click manual: "Deploy" en Vercel Dashboard
3. Esperar ~3-5 minutos

### 7. Migraciones de BD

```bash
# Ejecutar en Vercel CLI
vercel env pull  # Descarga env vars locales

# O ejecutar via serverless function
# Crear archivo: api/db/migrate.ts con llamada a Prisma
```

### 8. Crear Super Admin

```bash
# Opción local (si tienes BD remota):
npm run db:create-super-admin

# O crear script en servidor:
# API endpoint POST /api/db/seed con parámetros
```

### ✅ Verificar Deployment

```bash
# Health check
curl https://tuapp.vercel.app/api/public/health

# Debe retornar: {"status":"ok","timestamp":"..."}
```

---

## 🐳 Deployment en Docker

**Ideal para Control total, Kubernetes, VPS.**

### 1. Crear Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Crear docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: aurora_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: aurora_nova_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aurora_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://aurora_user:secure_password@postgres:5432/aurora_nova_db
      NEXTAUTH_SECRET: your_secret_here
      NEXTAUTH_URL: http://localhost:3000
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/public/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
```

### 3. Build y Run

```bash
# Build imagen
docker build -t aurora-nova:1.0.0 .

# Run con docker-compose
docker-compose up -d

# Verificar que está corriendo
docker ps
docker logs <container-id>

# Health check
curl http://localhost:3000/api/public/health
```

### 4. Push a Registry (DockerHub)

```bash
# Login
docker login

# Tag
docker tag aurora-nova:1.0.0 tuusuario/aurora-nova:1.0.0

# Push
docker push tuusuario/aurora-nova:1.0.0
```

---

## 🖥️ Deployment en VPS (Ubuntu/DigitalOcean)

**Para control total y mejor precio que Vercel.**

### 1. Crear Droplet en DigitalOcean

- Seleccionar Ubuntu 22.04 LTS
- Tamaño: Mínimo $6/mes (development), $12+ para producción
- Región: Cercana a usuarios
- SSH key: Usar tu public key

### 2. SSH y Setup Inicial

```bash
ssh root@tu_ip

# Update sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Instalar Nginx (reverse proxy)
apt install -y nginx

# Instalar PM2 (process manager)
npm install -g pm2
```

### 3. Setup PostgreSQL

```bash
sudo -u postgres psql

CREATE USER aurora_user WITH PASSWORD 'secure_password';
CREATE DATABASE aurora_nova_db OWNER aurora_user;
ALTER ROLE aurora_user SET client_encoding TO 'utf8';
ALTER ROLE aurora_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE aurora_user SET default_transaction_deferrable TO on;
ALTER ROLE aurora_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE aurora_nova_db TO aurora_user;
\q
```

### 4. Clonar y Configurar Aplicación

```bash
# Crear directorio
mkdir -p /var/www/aurora-nova
cd /var/www/aurora-nova

# Clone repo
git clone https://github.com/tuusuario/aurora-nova.git .
cd application-base

# Instalar dependencias
npm install

# Crear .env.production.local
cat > .env.production.local << EOF
DATABASE_URL=postgresql://aurora_user:secure_password@localhost:5432/aurora_nova_db
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://tudominio.com
NODE_ENV=production
LOG_LEVEL=info
EOF

# Build
npm run build

# Migraciones
npx prisma migrate deploy

# Seed (opcional)
npm run db:seed
```

### 5. Configurar PM2

```bash
# Start con PM2
pm2 start npm --name "aurora-nova" -- start

# Make it persistent
pm2 startup
pm2 save
```

### 6. Configurar Nginx

```bash
# Crear config
cat > /etc/nginx/sites-available/aurora-nova << 'EOF'
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Habilitar
ln -s /etc/nginx/sites-available/aurora-nova /etc/nginx/sites-enabled/

# Test
nginx -t

# Restart
systemctl restart nginx
```

### 7. HTTPS con Let's Encrypt

```bash
# Instalar certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d tudominio.com -d www.tudominio.com

# Auto-renewal
systemctl enable certbot.timer
```

### ✅ Verificar

```bash
curl https://tudominio.com/api/public/health
```

---

## ☸️ Deployment en Kubernetes

**Para aplicaciones de escala enterprise.**

### 1. Crear Docker Image

Ver sección de Docker arriba.

### 2. Manifests Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aurora-nova
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aurora-nova
  template:
    metadata:
      labels:
        app: aurora-nova
    spec:
      containers:
      - name: aurora-nova
        image: tuusuario/aurora-nova:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: nextauth-secret
        livenessProbe:
          httpGet:
            path: /api/public/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/public/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: aurora-nova-service
spec:
  selector:
    app: aurora-nova
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 3. Crear Secrets

```bash
kubectl create secret generic aurora-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=nextauth-secret="$(openssl rand -base64 32)"
```

### 4. Deploy

```bash
kubectl apply -f deployment.yaml

# Verificar
kubectl get pods
kubectl get services
```

---

## 📋 Post-Deployment

### Verificaciones Inmediatas

```bash
# 1. Health check
curl https://tudominio.com/api/public/health

# 2. Login test
curl -X POST https://tudominio.com/api/auth/signin

# 3. Crear super admin (si no existe)
npm run db:create-super-admin

# 4. Verificar logs
pm2 logs aurora-nova  # (si usas PM2)
# o
docker logs <container>  # (si usas Docker)
```

### Configuración Post-Deploy

- [ ] Crear usuario super admin
- [ ] Verificar variables de entorno
- [ ] Configurar email (si usas recuperación de contraseña)
- [ ] Habilitar backups automáticos
- [ ] Configurar monitoring y alertas
- [ ] Revisar logs de deployment

---

## 📊 Monitoring y Logs

### Logs Estructurados

Aurora Nova usa Pino para logs. En producción, envía a:

```bash
# Datadog
npm install dd-trace

# CloudWatch (AWS)
npm install @aws-lambda-powertools/logger

# Loggly
npm install bunyan-loggly
```

### Health Check

```bash
# Verificar constantemente
watch -n 5 'curl -s https://tudominio.com/api/public/health | jq .'

# O agregar a monitoreo:
# - Prometheus scrape /metrics
# - DataDog agent
# - New Relic
```

### Backups

```bash
# PostgreSQL backup automático
pg_dump aurora_nova_db > backup.sql

# Schedule con cron
0 2 * * * pg_dump aurora_nova_db > /backups/$(date +\%Y-\%m-\%d).sql
```

---

## 🔧 Troubleshooting

### Aplicación no inicia

```bash
# Verificar logs
npm run dev  # Local
docker logs <id>  # Docker
pm2 logs  # PM2

# Validar variables de entorno
echo $DATABASE_URL
echo $NEXTAUTH_SECRET

# Probale migraciones
npx prisma migrate deploy
```

### Database connection error

```bash
# Verificar conectividad
psql postgresql://user:pass@host:5432/db

# Verificar DATABASE_URL
echo $DATABASE_URL

# Reiniciar PostgreSQL
systemctl restart postgresql
```

### Health check falla

```bash
# Verificar endpoint
curl -v http://localhost:3000/api/public/health

# Verificar puerto
netstat -tulpn | grep 3000

# Reiniciar aplicación
pm2 restart aurora-nova
```

### Performance lento

```bash
# Verificar CPU/memoria
free -h
top

# Verificar BD queries
npm run analyze-db

# Aumentar replicas (Kubernetes)
kubectl scale deployment aurora-nova --replicas=5
```

---

## 📞 Support

- Issues: GitHub Issues
- Security: Ver SECURITY.md
- General: support@example.com

---

**Aurora Nova Deployment Guide**

*Última actualización: December 5, 2025*
