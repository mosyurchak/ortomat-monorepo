import { Module } from '@nestjs/common';
import { MonoPaymentService } from './mono-payment.service';
import { MonoPaymentController } from './mono-payment.controller';

/**
 * Модуль для роботи з Monobank Acquiring API (Plata by Mono)
 *
 * Надає:
 * - MonoPaymentService - для створення invoice та обробки webhook
 * - MonoPaymentController - HTTP endpoints для frontend та Monobank
 *
 * Використання в інших модулях:
 * 1. Імпортувати MonoPaymentModule в imports
 * 2. Ін'єктувати MonoPaymentService через constructor
 *
 * Приклад:
 * ```typescript
 * @Module({
 *   imports: [MonoPaymentModule],
 * })
 * export class OrdersModule {}
 *
 * @Injectable()
 * export class OrdersService {
 *   constructor(private monoPaymentService: MonoPaymentService) {}
 * }
 * ```
 */
@Module({
  controllers: [MonoPaymentController],
  providers: [MonoPaymentService],
  exports: [MonoPaymentService], // Експортуємо сервіс для використання в інших модулях
})
export class MonoPaymentModule {}
