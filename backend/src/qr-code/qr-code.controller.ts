import { Controller, Get, Param } from '@nestjs/common';
import { QrCodeService } from './qr-code.service';

@Controller('qr-code')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Get('doctor/:doctorId')
  async getDoctorQRCode(@Param('doctorId') doctorId: string) {
    return this.qrCodeService.generateDoctorQRCode(doctorId);
  }
}