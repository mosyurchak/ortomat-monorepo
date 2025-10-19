import { Controller, Get, Query, UseGuards, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from './logs.service';
import { LogType, Severity } from '@prisma/client';

@Controller('logs')
@UseGuards(AuthGuard('jwt'))
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async getLogs(
    @Query('type') type?: LogType,
    @Query('category') category?: string,
    @Query('severity') severity?: Severity,
    @Query('ortomatId') ortomatId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.logsService.getLogs({
      type,
      category,
      severity,
      ortomatId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('stats')
  async getLogsStats(
    @Query('ortomatId') ortomatId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.logsService.getLogsStats({
      ortomatId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Delete('clean')
  async cleanOldLogs(@Query('days') days?: string) {
    const daysToKeep = days ? parseInt(days) : 30;
    return this.logsService.cleanOldLogs(daysToKeep);
  }
}