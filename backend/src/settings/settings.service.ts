// backend/src/settings/settings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpdateSettingsDto {
  purchaseTerms?: string;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Отримати поточні налаштування
   */
  async getSettings() {
    let settings = await this.prisma.settings.findUnique({
      where: { id: 'default' },
    });

    // Якщо налаштувань немає - створюємо дефолтні
    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {
          id: 'default',
          purchaseTerms: `Загальні умови покупки:

1. Оплата здійснюється через платіжну систему Monobank
2. Після успішної оплати ви отримаєте код доступу до комірки
3. Товар необхідно забрати протягом 24 годин
4. Повернення товару можливе протягом 14 днів
5. При виявленні браку - звертайтесь до служби підтримки

Контакти підтримки: support@ortomat.com`,
        },
      });
    }

    return settings;
  }

  /**
   * Оновити налаштування
   */
  async updateSettings(data: UpdateSettingsDto) {
    const settings = await this.getSettings();

    return this.prisma.settings.update({
      where: { id: 'default' },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Отримати тільки умови покупки (швидкий доступ)
   */
  async getPurchaseTerms(): Promise<string> {
    const settings = await this.getSettings();
    return settings.purchaseTerms || '';
  }
}