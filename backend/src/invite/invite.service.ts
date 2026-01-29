import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class InviteService {
  constructor(private prisma: PrismaService) {}

  /**
   * Створити invite токен для ортомата
   */
  async createInvite(ortomatId: string, createdBy: string): Promise<{
    token: string;
    inviteUrl: string;
    qrCodeData: string;
  }> {
    // Перевірка чи існує ортомат
    const ortomat = await this.prisma.ortomat.findUnique({
      where: { id: ortomatId },
    });

    if (!ortomat) {
      throw new NotFoundException('Ortomat not found');
    }

    // Генерація токену
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 днів

    // Збереження в БД
    await this.prisma.ortomatInvite.create({
      data: {
        ortomatId,
        token,
        createdBy,
        expiresAt,
      },
    });

    // Генерація URL
    const inviteUrl = `${process.env.FRONTEND_URL}/register?invite=${token}`;

    return {
      token,
      inviteUrl,
      qrCodeData: inviteUrl,
    };
  }

  /**
   * Перевірити invite токен
   */
  async validateInvite(token: string): Promise<{
    valid: boolean;
    ortomatId?: string;
    ortomatName?: string;
    ortomatAddress?: string;
  }> {
    const invite = await this.prisma.ortomatInvite.findUnique({
      where: { token },
      include: {
        ortomat: true,
      },
    });

    if (!invite) {
      return { valid: false };
    }

    // Перевірка чи не використаний
    if (invite.usedAt) {
      return { valid: false };
    }

    // Перевірка чи не expired
    if (new Date() > invite.expiresAt) {
      return { valid: false };
    }

    // Перевірка чи активний
    if (!invite.isActive) {
      return { valid: false };
    }

    return {
      valid: true,
      ortomatId: invite.ortomatId,
      ortomatName: invite.ortomat.name,
      ortomatAddress: invite.ortomat.address,
    };
  }

  /**
   * Використати invite токен (після реєстрації лікаря)
   */
  async useInvite(token: string, doctorId: string): Promise<void> {
    const invite = await this.prisma.ortomatInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Invite already used');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite expired');
    }

    // Позначити як використаний
    await this.prisma.ortomatInvite.update({
      where: { token },
      data: {
        usedAt: new Date(),
        usedBy: doctorId,
      },
    });

    // Створити referral code
    const referralCode = `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Призначити лікаря до ортомата
    await this.prisma.doctorOrtomat.create({
      data: {
        doctorId,
        ortomatId: invite.ortomatId,
        referralCode,
        totalPoints: 0, // Початково 0 балів
      },
    });
  }

  /**
   * Отримати всі invites для ортомата
   */
  async getOrtomatInvites(ortomatId: string) {
    return this.prisma.ortomatInvite.findMany({
      where: { ortomatId },
      orderBy: { createdAt: 'desc' },
      include: {
        ortomat: true,
      },
    });
  }

  /**
   * Деактивувати invite
   */
  async deactivateInvite(token: string): Promise<void> {
    await this.prisma.ortomatInvite.update({
      where: { token },
      data: { isActive: false },
    });
  }
}
