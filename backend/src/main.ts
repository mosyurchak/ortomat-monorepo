import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable graceful shutdown hooks (for Telegram bot cleanup)
  app.enableShutdownHooks();

  // ✅ SECURITY: Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API (frontend handles it)
    crossOriginEmbedderPolicy: false, // Needed for CORS
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ ДОДАНО: Allow images/QR codes to be loaded from different origins
  }));

  // ✅ SECURITY: Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip non-DTO properties
    forbidNonWhitelisted: true, // Throw error on extra properties (SECURITY)
    transform: true, // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: false, // Prevent type coercion attacks
    },
  }));

  // ✅ Payload limit для великих backup файлів
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ✅ WebSocket adapter для ESP32
  app.useWebSocketAdapter(new WsAdapter(app));
  
  // ✅ CORS конфігурація з whitelist дозволених origins
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://ortomat-monorepo.vercel.app',
        'https://ortomat.com.ua',
        'https://www.ortomat.com.ua',
      ];

      // Дозволяємо запити без origin (Postman, curl, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      // Перевіряємо точні збіги
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Дозволяємо всі Vercel preview deployments
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // Блокуємо інші origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization', 'Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Port from environment or default
  const port = process.env.PORT || 3001;
  
  // Listen on 0.0.0.0 for Railway
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend running on port ${port}`);
  console.log(`🔌 WebSocket server on ws://0.0.0.0:${port}/ws`);
  console.log(`✅ Allowed CORS origins: [
  'http://localhost:3000',
  'https://ortomat-monorepo.vercel.app',
  'https://ortomat.com.ua',
  'https://www.ortomat.com.ua',
  '*.vercel.app'
]`);

  // ✅ Graceful shutdown on SIGTERM (Railway uses this)
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await app.close();
    console.log('✅ Application closed');
    process.exit(0);
  });

  // ✅ Graceful shutdown on SIGINT (Ctrl+C locally)
  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await app.close();
    console.log('✅ Application closed');
    process.exit(0);
  });
}

bootstrap();