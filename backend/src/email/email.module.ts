import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'apikey', // ✅ Завжди 'apikey' для SendGrid
          pass: process.env.SENDGRID_API_KEY, // ✅ Ваш SendGrid API Key
        },
      },
      defaults: {
        from: process.env.SMTP_FROM || 'noreply@ortomat.com.ua',
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    PrismaModule,
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}