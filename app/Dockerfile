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

# Construir la aplicación para producción
RUN npm run build

# ============================================================================
# FASE 2: PRODUCTION - Creación de la imagen final de producción
# ============================================================================

FROM node:20-alpine AS production

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar dependencias de producción desde la fase de build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Copiar la aplicación construida desde la fase de build
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Exponer el puerto en el que corre la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación en modo producción
CMD ["npm", "run", "start"]
