import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrtomatsModule } from './ortomats/ortomats.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrCodeModule } from './qr-code/qr-code.module';
import { LogsModule } from './logs/logs.module'; // ✅ ДОДАНО

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrtomatsModule,
    ProductsModule,
    SalesModule,
    OrdersModule,
    QrCodeModule,
    LogsModule, // ✅ ДОДАНО
  ],
})
export class AppModule {}