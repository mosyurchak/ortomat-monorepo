import { Controller, Get, Query } from '@nestjs/common';
import { QrCodeService } from './qr-code.service';

@Controller('qr-code')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Get('generate')
  async generateQRCode(@Query('referralCode') referralCode: string) {
    const qrCode = await this.qrCodeService.generateQRCode(referralCode);
    return { qrCode };
  }
}