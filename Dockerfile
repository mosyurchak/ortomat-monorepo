# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY .npmrc* ./

# Install root dependencies
RUN npm install --legacy-peer-deps

# Copy backend files
COPY backend/package*.json ./backend/
COPY backend/.npmrc* ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --legacy-peer-deps

# Copy backend source
COPY backend ./

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# Production stage
FROM node:20-alpine

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
CMD ["node", "dist/main.js"]