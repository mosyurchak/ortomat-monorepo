import { Controller, Get, Param, UseGuards, Res, Header } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QrCodeService } from './qr-code.service';
import { Response } from 'express';

@Controller('qr-code')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  // ✅ Захищений endpoint для отримання JSON з QR-кодом
  @UseGuards(AuthGuard('jwt'))
  @Get('doctor/:id')
  async getDoctorQRCode(@Param('id') doctorId: string) {
    return this.qrCodeService.getDoctorQRCodeUrl(doctorId);
  }

  // ✅ ДОДАНО: Публічний endpoint для отримання QR-коду як PNG зображення
  @Get('doctor/:id/image')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=3600')
  async getDoctorQRCodeImage(
    @Param('id') doctorId: string,
    @Res() res: Response,
  ) {
    try {
      const qrCodeDataUrl = await this.qrCodeService.generateDoctorQRCode(doctorId);

      // Конвертуємо base64 data URL в binary buffer
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      res.send(imageBuffer);
    } catch (error) {
      res.status(404).json({
        message: error.message || 'QR code not found',
        statusCode: 404,
      });
    }
  }
}