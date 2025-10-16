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
import { OrtomatsGateway } from './ortomats.gateway';
import { CreateOrtomatDto, UpdateOrtomatDto } from './dto/create-ortomat.dto.ts';
import { UpdateCellProductDto, MarkCellFilledDto } from './dto/update-cell.dto.ts';

@Controller('ortomats')
export class OrtomatsController {
  constructor(
    private readonly ortomatsService: OrtomatsService,
    private readonly ortomatsGateway: OrtomatsGateway,
  ) {}

  // ==================== WebSocket Device Status ====================
  
  @Get('devices/status')
  getDevicesStatus() {
    const devices = this.ortomatsGateway.getConnectedDevices();
    
    return {
      total: devices.length,
      online: devices,
      devices: devices.map(deviceId => ({
        deviceId,
        online: true,
        diagnostic: this.ortomatsGateway.getDeviceDiag(deviceId),
      })),
    };
  }

  @Get('devices/:deviceId/status')
  getDeviceStatus(@Param('deviceId') deviceId: string) {
    const isOnline = this.ortomatsGateway.isDeviceOnline(deviceId);
    const diag = this.ortomatsGateway.getDeviceDiag(deviceId);
    
    return {
      deviceId,
      online: isOnline,
      diagnostic: diag,
    };
  }

  // ==================== Ortomats CRUD ====================

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createOrtomatDto: CreateOrtomatDto) {
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

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.ortomatsService.getInventory(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrtomatDto: UpdateOrtomatDto) {
    return this.ortomatsService.update(id, updateOrtomatDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ortomatsService.remove(id);
  }

  // ==================== Assignments ====================

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/doctors')
  assignDoctor(
    @Param('id') id: string,
    @Body() body: { doctorId: string; commissionPercent?: number },
  ) {
    return this.ortomatsService.assignDoctor(
      id,
      body.doctorId,
      body.commissionPercent,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/couriers')
  assignCourier(
    @Param('id') id: string,
    @Body() body: { courierId: string },
  ) {
    return this.ortomatsService.assignCourier(id, body.courierId);
  }

  // ==================== Cell Operations ====================

  @Post(':id/open-cell')
  openCell(
    @Param('id') id: string,
    @Body() body: { cellNumber: number },
  ) {
    return this.ortomatsService.openCell(id, body.cellNumber);
  }

  // ✅ Адмін: Прив'язати/видалити товар з комірки
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/cells/:cellNumber/product')
  updateCellProduct(
    @Param('id') id: string,
    @Param('cellNumber') cellNumber: string,
    @Body() body: UpdateCellProductDto,
  ) {
    return this.ortomatsService.updateCellProduct(
      id,
      parseInt(cellNumber),
      body.productId,
    );
  }

  // ✅ НОВИЙ: Кур'єр відкриває комірку для поповнення
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cells/:cellNumber/open-for-refill')
  openCellForRefill(
    @Param('id') id: string,
    @Param('cellNumber') cellNumber: string,
    @Body() body: { courierId: string },
  ) {
    return this.ortomatsService.openCellForRefill(
      id,
      parseInt(cellNumber),
      body.courierId,
    );
  }

  // ✅ НОВИЙ: Кур'єр відмічає комірку як заповнену
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cells/:cellNumber/mark-filled')
  markCellFilled(
    @Param('id') id: string,
    @Param('cellNumber') cellNumber: string,
    @Body() body: MarkCellFilledDto,
  ) {
    return this.ortomatsService.markCellFilled(
      id,
      parseInt(cellNumber),
      body.courierId,
    );
  }

  // Старий refill endpoint - залишаємо для зворотної сумісності
  @Post(':id/cells/:cellNumber/refill')
  refillCell(
    @Param('id') id: string,
    @Param('cellNumber') cellNumber: string,
    @Body() body: { productId: string; courierId: string },
  ) {
    return this.ortomatsService.refillCell(
      id,
      parseInt(cellNumber),
      body.productId,
      body.courierId,
    );
  }
}