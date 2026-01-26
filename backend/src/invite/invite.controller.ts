import { Controller, Post, Get, Param, Query, Body, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/user.decorator';

@Controller('invite')
export class InviteController {
  constructor(private inviteService: InviteService) {}

  /**
   * Створити invite для ортомата (тільки Admin)
   */
  @Post('create/:ortomatId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createInvite(
    @Param('ortomatId') ortomatId: string,
    @User() user: any,
  ) {
    return this.inviteService.createInvite(ortomatId, user.userId);
  }

  /**
   * Перевірити invite токен (публічний)
   */
  @Get('validate')
  async validateInvite(@Query('token') token: string) {
    return this.inviteService.validateInvite(token);
  }

  /**
   * Отримати invites для ортомата (Admin)
   */
  @Get('ortomat/:ortomatId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getOrtomatInvites(@Param('ortomatId') ortomatId: string) {
    return this.inviteService.getOrtomatInvites(ortomatId);
  }

  /**
   * Деактивувати invite (Admin)
   */
  @Post('deactivate/:token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deactivateInvite(@Param('token') token: string) {
    await this.inviteService.deactivateInvite(token);
    return { message: 'Invite deactivated' };
  }
}
