import { Module } from '@nestjs/common';
import { OrtomatsService } from './ortomats.service';
import { OrtomatsController } from './ortomats.controller';
import { OrtomatsGateway } from './ortomats.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrtomatsController],
  providers: [OrtomatsService, OrtomatsGateway],
  exports: [OrtomatsService, OrtomatsGateway],
})
export class OrtomatsModule {}