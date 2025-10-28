import { Module } from '@nestjs/common';
import { LiqPayService } from './liqpay.service';
import { LiqPayController } from './liqpay.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Module({
  controllers: [LiqPayController],
  providers: [LiqPayService, PrismaService, EmailService],
  exports: [LiqPayService],
})
export class LiqPayModule {}