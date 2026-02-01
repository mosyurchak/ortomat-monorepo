import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrtomatsModule } from '../ortomats/ortomats.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { MonoPaymentModule } from '../mono-payment/mono-payment.module';
import { CellManagementModule } from '../cell-management/cell-management.module';

@Module({
  imports: [
    PrismaModule,
    OrtomatsModule,
    LogsModule,
    MonoPaymentModule,
    CellManagementModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}