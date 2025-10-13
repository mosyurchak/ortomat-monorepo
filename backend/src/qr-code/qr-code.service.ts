import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  constructor(private prisma: PrismaService) {}

  async generateDoctorQRCode(doctorId: string): Promise<string> {
    // Знаходимо лікаря з ортоматами
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorOrtomats: {
          include: {
            ortomat: true,
          },
        },
      },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new Error('Doctor not found');
    }

    // Перевіряємо чи є прив'язаний ортомат
    if (!doctor.doctorOrtomats || doctor.doctorOrtomats.length === 0) {
      throw new Error('Doctor has no assigned ortomats');
    }

    // Беремо перший прив'язаний ортомат
    const assignedOrtomat = doctor.doctorOrtomats[0].ortomat;
    const referralCode = doctor.doctorOrtomats[0].referralCode;

    // Формуємо URL на конкретний ортомат з реферальним кодом
    const url = `${process.env.FRONTEND_URL}/catalog/${assignedOrtomat.id}?ref=${referralCode}`;

    // Генеруємо QR-код як Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    return qrCodeDataUrl;
  }

  async getDoctorQRCodeUrl(doctorId: string): Promise<{
    qrCodeUrl: string;
    referralUrl: string;
    ortomatId: string;
    ortomatName: string;
  }> {
    // Знаходимо лікаря з ортоматом
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorOrtomats: {
          include: {
            ortomat: true,
          },
        },
      },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new Error('Doctor not found');
    }

    if (!doctor.doctorOrtomats || doctor.doctorOrtomats.length === 0) {
      throw new Error('Doctor has no assigned ortomats');
    }

    const assignedOrtomat = doctor.doctorOrtomats[0].ortomat;
    const referralCode = doctor.doctorOrtomats[0].referralCode;

    // Генеруємо QR-код
    const qrCodeDataUrl = await this.generateDoctorQRCode(doctorId);

    // Формуємо URL на ортомат з реферальним кодом
    const referralUrl = `${process.env.FRONTEND_URL}/catalog/${assignedOrtomat.id}?ref=${referralCode}`;

    return {
      qrCodeUrl: qrCodeDataUrl,
      referralUrl,
      ortomatId: assignedOrtomat.id,
      ortomatName: assignedOrtomat.name,
    };
  }
}