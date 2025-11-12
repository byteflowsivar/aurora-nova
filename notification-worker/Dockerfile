# notification-worker/Dockerfile

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; else npm install --omit=dev; fi

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package.json and install production dependencies
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --prod; else npm install --omit=dev; fi

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts # Copy scripts for health checks

# Expose port (if any, though worker typically doesn't expose HTTP)
# EXPOSE 3001

# Command to run the worker
CMD ["node", "dist/index.js"]
