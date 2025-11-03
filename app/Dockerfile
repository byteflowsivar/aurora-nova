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

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Crear un usuario y grupo no root para mayor seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar los archivos de la salida standalone desde la fase de build
COPY --from=build /app/.next/standalone ./

# Copiar los assets estáticos y públicos
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copiar el schema de Prisma para que esté disponible en tiempo de ejecución
COPY --from=build /app/prisma ./prisma

# Cambiar al usuario no root
USER nextjs

EXPOSE 3000

ENV PORT 3000

# El comando de inicio ahora usa el server.js generado por el modo standalone
CMD ["node", "server.js"]
