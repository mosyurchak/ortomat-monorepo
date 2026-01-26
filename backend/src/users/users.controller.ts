import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  // ⭐ Get all doctors
  @UseGuards(AuthGuard('jwt'))
  @Get('doctors')
  getDoctors() {
    return this.usersService.getDoctors();
  }

  // ⭐ Get all couriers
  @UseGuards(AuthGuard('jwt'))
  @Get('couriers')
  getCouriers() {
    return this.usersService.getCouriers();
  }

  // ⭐ Create doctor
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('doctors')
  createDoctor(@Body() data: any) {
    return this.usersService.createDoctor(data);
  }

  // ⭐ Update doctor
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Patch('doctors/:id')
  updateDoctor(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateDoctor(id, data);
  }

  // ⭐ Delete doctor
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Delete('doctors/:id')
  deleteDoctor(@Param('id') id: string) {
    return this.usersService.deleteDoctor(id);
  }

  // ⭐ Admin stats endpoint
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get('admin/stats')
  getAdminStats() {
    return this.usersService.getAdminStats();
  }

  // ⭐ Stats endpoint для лікарів
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/stats')
  getDoctorStats(@Param('id') id: string, @Request() req) {
    // Лікарі можуть дивитись тільки свою статистику, адміни - будь-яку
    if (req.user.role !== 'ADMIN' && req.user.userId !== id) {
      throw new ForbiddenException('You can only view your own statistics');
    }
    return this.usersService.getDoctorStats(id);
  }

  // ⭐ Courier ortomats endpoint
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/courier-ortomats')
  getCourierOrtomats(@Param('id') id: string, @Request() req) {
    // Кур'єри можуть дивитись тільки свої ортомати, адміни - будь-які
    if (req.user.role !== 'ADMIN' && req.user.userId !== id) {
      throw new ForbiddenException('You can only view your own ortomats');
    }
    return this.usersService.getCourierOrtomats(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.usersService.update(id, updateData);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}