import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  constructor(private configService: ConfigService) {}

  async generateQRCode(referralCode: string): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const url = `${frontendUrl}/catalog?ref=${referralCode}`;
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataURL;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }
}