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

# Copy built application from builder
COPY --from=builder /app/backend/dist ./dist

# Remove dev dependencies after prisma generate
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "dist/src/main.js"]