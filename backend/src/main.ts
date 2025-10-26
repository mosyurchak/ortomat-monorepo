import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ WebSocket adapter для ESP32
  app.useWebSocketAdapter(new WsAdapter(app));
  
  // ✅ СПРОЩЕНА CORS конфігурація (без callback функції)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://ortomat-monorepo.vercel.app',
      'https://ortomat.com.ua',
      'https://www.ortomat.com.ua',
      /\.vercel\.app$/, // Всі Vercel preview deployments
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
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
}

bootstrap();