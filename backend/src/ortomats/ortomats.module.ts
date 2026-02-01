import { Module, forwardRef } from '@nestjs/common';
import { OrtomatsService } from './ortomats.service';
import { OrtomatsController } from './ortomats.controller';
import { OrtomatsGateway } from './ortomats.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { CellManagementModule } from '../cell-management/cell-management.module';

@Module({
  imports: [
    PrismaModule,
    LogsModule,
    forwardRef(() => CellManagementModule),
  ],
  controllers: [OrtomatsController],
  providers: [OrtomatsService, OrtomatsGateway],
  exports: [OrtomatsService, OrtomatsGateway],
})
export class OrtomatsModule {}