import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Port from environment or default
  const port = process.env.PORT || 3001;
  
  // Listen on 0.0.0.0 for Railway
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();