import {
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Експорт всіх даних БД
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
      res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
      throw new HttpException(
        `Помилка створення бекапу: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Імпорт даних з бекапу
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
