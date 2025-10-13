import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QrCodeService } from './qr-code.service';

@Controller('qr-code')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('doctor/:id')
  async getDoctorQRCode(@Param('id') doctorId: string) {
    return this.qrCodeService.getDoctorQRCodeUrl(doctorId);
  }
}