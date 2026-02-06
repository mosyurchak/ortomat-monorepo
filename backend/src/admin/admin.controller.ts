import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  // Експорт всіх даних БД
  // ✅ SECURITY: Rate limited to 2 backups per hour (CRITICAL - exports entire DB)
  @Throttle({ default: { limit: 2, ttl: 3600000 } }) // 2 per hour
  @Get('backup')
  async exportData(@Res() res: Response) {
    try {
      const backupData = await this.adminService.exportAllData();

      // Генеруємо ім'я файлу з датою та часом
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `ortomat-backup-${timestamp}.json`;

      // Відправляємо файл для завантаження
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(backupData));
    } catch (error) {
      this.logger.error(`Backup creation failed: ${error.message}`);
      this.logger.error(`Error details: ${error.name} - ${error.stack}`);
      throw new HttpException(
        `Помилка створення бекапу: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Імпорт даних з бекапу
  // ✅ SECURITY: Rate limited to 1 restore per hour (ULTRA CRITICAL - restores entire DB)
  @Throttle({ default: { limit: 1, ttl: 3600000 } }) // 1 per hour
  @Post('restore')
  async importData(@Body() backupData: any) {
    try {
      await this.adminService.restoreAllData(backupData);
      return {
        success: true,
        message: 'Дані успішно відновлено з бекапу',
      };
    } catch (error) {
      throw new HttpException(
        `Помилка відновлення даних: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
