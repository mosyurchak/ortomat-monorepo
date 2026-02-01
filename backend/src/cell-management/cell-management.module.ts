import { Module, forwardRef } from '@nestjs/common';
import { CellManagementService } from './cell-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { OrtomatsModule } from '../ortomats/ortomats.module';

@Module({
  imports: [PrismaModule, LogsModule, forwardRef(() => OrtomatsModule)],
  providers: [CellManagementService],
  exports: [CellManagementService],
})
export class CellManagementModule {}
