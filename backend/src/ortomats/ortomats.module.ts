import { Module } from '@nestjs/common';
import { OrtomatsService } from './ortomats.service';
import { OrtomatsController } from './ortomats.controller';
import { OrtomatsGateway } from './ortomats.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module'; // ✅ ДОДАНО

@Module({
  imports: [
    PrismaModule,
    LogsModule, // ✅ ДОДАНО
  ],
  controllers: [OrtomatsController],
  providers: [OrtomatsService, OrtomatsGateway],
  exports: [OrtomatsService, OrtomatsGateway],
})
export class OrtomatsModule {}