import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ✅ НОВИЙ: Admin статистика
  @Get('admin/stats')
  @UseGuards(AuthGuard('jwt'))
  getAdminStats() {
    return this.salesService.getAdminStats();
  }

  // ✅ НОВИЙ: Статистика лікаря
  @Get('doctor/:doctorId')
  @UseGuards(AuthGuard('jwt'))
  getDoctorStats(@Param('doctorId') doctorId: string) {
    return this.salesService.getDoctorStats(doctorId);
  }

  @Post('purchase')
  processPurchase(@Body() purchaseDto: any) {
    return this.salesService.processPurchase(purchaseDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}