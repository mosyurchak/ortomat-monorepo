# Build stage
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy backend files first
COPY backend ./backend

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./
COPY backend/.npmrc* ./

# Install ALL dependencies (including dev for prisma)
RUN npm install --legacy-peer-deps

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy migrations
COPY backend/prisma/migrations ./prisma/migrations

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Copy entrypoint script
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Force cache invalidation for CMD layer
ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

# NOTE: We keep prisma CLI (devDependency) for runtime migrations
# DO NOT run "npm prune --production" here!

# Expose port
EXPOSE 3001

# Start application with migrations (v2 - force rebuild)
CMD ["sh", "-c", "./entrypoint.sh"]