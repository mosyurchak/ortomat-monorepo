import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ✅ Enable graceful shutdown hooks (for Telegram bot cleanup)
  app.enableShutdownHooks();

  // ✅ SECURITY: Security headers with Helmet
  app.use(helmet({
    // ✅ SECURITY: Enable CSP for API (basic protection)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'none'"], // API не потребує скриптів
        styleSrc: ["'none'"], // API не потребує стилів
        imgSrc: ["'self'", "data:", "https:"], // Дозволити зображення (QR коди)
        connectSrc: ["'self'"], // API calls тільки до себе
        fontSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for CORS
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ Allow images/QR codes from different origins
    // ✅ SECURITY: Additional security headers
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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

  // ✅ SECURITY: Payload limit (10mb для безпеки, достатньо для більшості запитів)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ✅ WebSocket adapter для ESP32
  app.useWebSocketAdapter(new WsAdapter(app));
  
  // ✅ SECURITY: CORS конфігурація з whitelist дозволених origins
  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://ortomat-monorepo.vercel.app',
        'https://ortomat.com.ua',
        'https://www.ortomat.com.ua',
      ];

      // ✅ SECURITY: Блокуємо запити без origin в production (окрім ESP32 WebSocket)
      if (!origin) {
        if (isProduction) {
          return callback(new Error('Origin header is required'));
        }
        // В development дозволяємо (для Postman/curl тестування)
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

  logger.log(`Backend running on port ${port}`);
  logger.log(`WebSocket server on ws://0.0.0.0:${port}/ws`);
  logger.log(`Allowed CORS origins: localhost:3000, ortomat.com.ua, *.vercel.app`);

  // ✅ Graceful shutdown on SIGTERM (Railway uses this)
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM received, shutting down gracefully...');
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });

  // ✅ Graceful shutdown on SIGINT (Ctrl+C locally)
  process.on('SIGINT', async () => {
    logger.warn('SIGINT received, shutting down gracefully...');
    await app.close();
    logger.log('Application closed');
    process.exit(0);
  });
}

bootstrap();