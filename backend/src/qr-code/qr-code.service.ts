import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  constructor(private prisma: PrismaService) {}

  async generateDoctorQRCode(doctorId: string) {
    console.log('🔍 Generating QR code for doctor:', doctorId);

    // Знаходимо лікаря
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Знаходимо реферальний код лікаря
    const doctorOrtomat = await this.prisma.doctorOrtomat.findFirst({
      where: { doctorId },
    });

    if (!doctorOrtomat) {
      console.log('⚠️ No referral code found for doctor');
      return {
        referralCode: null,
        qrCodeUrl: null,
        message: 'Referral code not assigned yet',
      };
    }

    const referralCode = doctorOrtomat.referralCode;

    // Генеруємо URL для QR-коду
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const referralUrl = `${frontendUrl}?ref=${referralCode}`;

    console.log('🔗 Referral URL:', referralUrl);

    // Генеруємо QR-код як Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(referralUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    console.log('✅ QR code generated successfully');

    return {
      referralCode,
      qrCodeUrl: qrCodeDataUrl,
      referralUrl,
    };
  }
}