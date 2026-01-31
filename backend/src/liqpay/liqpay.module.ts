import { Module } from '@nestjs/common';
import { LiqPayService } from './liqpay.service';
import { LiqPayController } from './liqpay.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [PrismaModule, EmailModule, TelegramBotModule],
  controllers: [LiqPayController],
  providers: [LiqPayService],
  exports: [LiqPayService],
})
export class LiqPayModule {}