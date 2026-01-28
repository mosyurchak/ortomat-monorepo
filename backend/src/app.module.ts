import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrtomatsModule } from './ortomats/ortomats.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { QrCodeModule } from './qr-code/qr-code.module';
import { LogsModule } from './logs/logs.module';
import { EmailModule } from './email/email.module';
import { InviteModule } from './invite/invite.module';
import { CourierModule } from './courier/courier.module';
import { MonoPaymentModule } from './mono-payment/mono-payment.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ✅ SECURITY: Rate limiting to prevent brute force attacks
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 20, // 20 requests per minute (default for all endpoints)
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrtomatsModule,
    ProductsModule,
    SalesModule,
    OrdersModule,
    QrCodeModule,
    LogsModule,
    EmailModule,
    InviteModule,
    CourierModule,
    MonoPaymentModule,
    SettingsModule,
    AdminModule,
  ],
  providers: [
    // ✅ SECURITY: Apply ThrottlerGuard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}