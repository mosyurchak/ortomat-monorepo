#!/bin/bash
# Temporary script to seed Railway database directly

echo "🌱 Seeding Railway PostgreSQL..."
echo ""
echo "⚠️  IMPORTANT: Run this with Railway DATABASE_URL:"
echo ""
echo "Example:"
echo "DATABASE_URL='postgresql://postgres:PASSWORD@HOST:PORT/railway' npm run prisma:seed --prefix backend"
echo ""
echo "Get DATABASE_URL from:"
echo "Railway Dashboard → PostgreSQL service → Variables tab → DATABASE_URL"
