// backend/src/settings/settings.controller.ts
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService, UpdateSettingsDto } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/settings
   * Отримати всі налаштування (публічний доступ для purchaseTerms)
   */
  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  /**
   * GET /api/settings/purchase-terms
   * Швидкий доступ до умов покупки
   */
  @Get('purchase-terms')
  async getPurchaseTerms() {
    const terms = await this.settingsService.getPurchaseTerms();
    return { purchaseTerms: terms };
  }

  /**
   * PUT /api/settings
   * Оновити налаштування (тільки для адміністраторів)
   */
  @UseGuards(AuthGuard('jwt'))
  @Put()
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}