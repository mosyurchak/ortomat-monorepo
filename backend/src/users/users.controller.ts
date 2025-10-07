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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

  // ⭐ Admin stats endpoint
  @Get('admin/stats')
  getAdminStats() {
    return this.usersService.getAdminStats();
  }

  // ⭐ Stats endpoint БЕЗ auth guard для тестування
  @Get(':id/stats')
  getDoctorStats(@Param('id') id: string) {
    return this.usersService.getDoctorStats(id);
  }

  // ⭐ Courier ortomats endpoint
  @Get(':id/courier-ortomats')
  getCourierOrtomats(@Param('id') id: string) {
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