import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ WebSocket adapter для ESP32
  app.useWebSocketAdapter(new WsAdapter(app));
  
  // CORS - підтримка множинних доменів
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://ortomat-monorepo.vercel.app',
    'https://ortomat.com.ua',
    'https://www.ortomat.com.ua', // ✅ З www
  ];

  // Додаємо FRONTEND_URL з environment якщо є
  if (process.env.FRONTEND_URL) {
    const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
    allowedOrigins.push(...envOrigins);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Дозволяємо запити без origin (Postman, curl, ESP32, mobile apps, etc)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Перевіряємо чи origin в списку дозволених
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (origin.endsWith('.vercel.app')) {
        // Дозволяємо всі Vercel preview deployments
        callback(null, true);
      } else {
        console.log('❌ CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Port from environment or default
  const port = process.env.PORT || 3001;
  
  // Listen on 0.0.0.0 for Railway
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Backend running on port ${port}`);
  console.log(`🔌 WebSocket server on ws://0.0.0.0:${port}/ws`);
  console.log('✅ Allowed CORS origins:', allowedOrigins);
}

bootstrap();