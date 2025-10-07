import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrtomatsService } from './ortomats.service';

@Controller('ortomats')
export class OrtomatsController {
  constructor(private readonly ortomatsService: OrtomatsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createOrtomatDto: any) {
    return this.ortomatsService.create(createOrtomatDto);
  }

  @Get()
  findAll() {
    return this.ortomatsService.findAll();
  }

  @Get('by-referral')
  findByReferral(@Query('code') referralCode: string) {
    return this.ortomatsService.findByReferralCode(referralCode);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ortomatsService.findOne(id);
  }

  @Get(':id/catalog')
  getCatalog(@Param('id') id: string, @Query('ref') referralCode?: string) {
    return this.ortomatsService.getCatalogWithAvailability(id, referralCode);
  }

  // ⭐ Inventory endpoint для кур'єра
  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.ortomatsService.getInventory(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrtomatDto: any) {
    return this.ortomatsService.update(id, updateOrtomatDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ortomatsService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/doctors')
  assignDoctor(
    @Param('id') id: string,
    @Body() body: { doctorId: string; commissionPercent?: number },
  ) {
    return this.ortomatsService.assignDoctor(id, body.doctorId, body.commissionPercent);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/couriers')
  assignCourier(
    @Param('id') id: string,
    @Body() body: { courierId: string },
  ) {
    return this.ortomatsService.assignCourier(id, body.courierId);
  }

  @Post(':id/open-cell')
  openCell(
    @Param('id') id: string,
    @Body() body: { cellNumber: number },
  ) {
    return this.ortomatsService.openCell(id, body.cellNumber);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cells/:cellNumber/product')
  updateCellProduct(
    @Param('id') id: string,
    @Param('cellNumber') cellNumber: string,
    @Body() body: { productId: string | null },
  ) {
    return this.ortomatsService.updateCellProduct(id, parseInt(cellNumber), body.productId);
  }

  // ⭐ Refill endpoint для кур'єра
  @Post(':id/cells/:cellNumber/refill')
  refillCell(
    @Param('id') id: string,
    @Param('cellNumber') cellNumber: string,
    @Body() body: { productId: string; courierId: string },
  ) {
    return this.ortomatsService.refillCell(id, parseInt(cellNumber), body.productId, body.courierId);
  }
}