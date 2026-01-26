// backend/src/courier/courier.controller.ts

import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CourierService } from './courier.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN') // ✅ Тільки Admin може керувати кур'єрами
export class CourierController {
  constructor(private courierService: CourierService) {}

  /**
   * Створити кур'єра
   */
  @Post()
  async createCourier(
    @Body() body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      phone: string;
      ortomatIds?: string[];
    }
  ) {
    return this.courierService.createCourier(body);
  }

  /**
   * Отримати всіх кур'єрів
   */
  @Get()
  async getAllCouriers() {
    return this.courierService.getAllCouriers();
  }

  /**
   * Отримати одного кур'єра
   */
  @Get(':id')
  async getCourier(@Param('id') id: string) {
    return this.courierService.getCourier(id);
  }

  /**
   * Оновити кур'єра
   */
  @Patch(':id')
  async updateCourier(
    @Param('id') id: string,
    @Body() body: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      middleName?: string;
      phone?: string;
      ortomatIds?: string[];
    }
  ) {
    return this.courierService.updateCourier(id, body);
  }

  /**
   * Видалити кур'єра
   */
  @Delete(':id')
  async deleteCourier(@Param('id') id: string) {
    return this.courierService.deleteCourier(id);
  }

  /**
   * Отримати доступні ортомати для призначення
   */
  @Get('available/ortomats')
  async getAvailableOrtomats() {
    return this.courierService.getAvailableOrtomats();
  }
}