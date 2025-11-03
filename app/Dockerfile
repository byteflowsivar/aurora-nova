# Dockerfile para Aurora Nova - Entorno de Producción

# ============================================================================
# FASE 1: BUILD - Construcción de la aplicación Next.js
# ============================================================================

FROM node:20-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Argumentos de build para variables de entorno requeridas
# Se asignan valores por defecto para permitir la compilación sin pasar los argumentos.
# ¡¡ADVERTENCIA!! Estos valores por defecto se incluirán en la imagen de Docker.
# No uses secretos reales aquí.
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
ARG AUTH_SECRET="dummy_secret_must_be_at_least_32_characters_long"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG APP_URL="http://localhost:3000"

# Exponer las variables de entorno durante el build
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV APP_URL=$APP_URL

# Generar el cliente Prisma con los binaryTargets correctos para el entorno Docker
RUN npx prisma generate

# Construir la aplicación para producción
RUN npm run build

# ============================================================================
# FASE 2: PRODUCTION - Creación de la imagen final de producción
# ============================================================================

FROM node:20-alpine AS production

# Establecer el directorio de trabajo
WORKDIR /app

# Variables de entorno para producción
ENV NODE_ENV=production

# Copiar dependencias de producción desde la fase de build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Copiar la aplicación construida desde la fase de build
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Copiar el cliente Prisma generado desde la fase de build
COPY --from=build /app/src/lib/prisma/generated ./src/lib/prisma/generated

# Variables de entorno para Auth.js en producción
ARG APP_URL
ENV AUTH_TRUST_HOST=true
ENV AUTH_URL=$APP_URL

# Exponer el puerto en el que corre la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación en modo producción
CMD ["npm", "run", "start"]
