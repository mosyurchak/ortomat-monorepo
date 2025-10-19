import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrtomatsModule } from '../ortomats/ortomats.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module'; // ✅ ДОДАНО

@Module({
  imports: [
    PrismaModule,
    OrtomatsModule,
    LogsModule, // ✅ ДОДАНО
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}