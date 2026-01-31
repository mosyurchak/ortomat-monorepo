import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN не встановлено. Telegram бот не буде запущено.');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('✅ Telegram бот успішно запущено');
      this.setupCommands();
    } catch (error) {
      this.logger.error('❌ Помилка запуску Telegram бота:', error);
    }
  }

  private setupCommands() {
    // Команда /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from?.username;

      await this.bot.sendMessage(
        chatId,
        `👋 Вітаю в Ortomat Referral Bot!\n\n` +
        `Цей бот допоможе вам:\n` +
        `• 📊 Переглядати вашу статистику балів\n` +
        `• 💰 Отримувати сповіщення про нові продажі\n\n` +
        `Для початку роботи прив'яжіть свій Telegram акаунт до профілю лікаря.\n` +
        `Надішліть команду /link разом з вашим email:\n` +
        `/link your.email@example.com`,
      );

      this.logger.log(`📱 /start від користувача ${username} (${chatId})`);
    });

    // Команда /link для прив'язки аккаунту
    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const username = msg.from?.username;
      const email = match?.[1]?.trim();

      if (!email) {
        await this.bot.sendMessage(chatId, '❌ Будь ласка, вкажіть ваш email:\n/link your.email@example.com');
        return;
      }

      try {
        // Знаходимо користувача за email
        const user = await this.prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            doctorOrtomats: {
              include: {
                ortomat: true,
              },
            },
          },
        });

        if (!user) {
          await this.bot.sendMessage(chatId, `❌ Користувача з email ${email} не знайдено.`);
          return;
        }

        if (user.role !== 'DOCTOR') {
          await this.bot.sendMessage(chatId, `❌ Цей сервіс доступний тільки для лікарів-рефералів.`);
          return;
        }

        // Перевіряємо чи не прив'язаний вже інший Telegram
        if (user.telegramChatId && user.telegramChatId !== chatId.toString()) {
          await this.bot.sendMessage(
            chatId,
            `⚠️ До цього акаунту вже прив'язано інший Telegram. Відв'яжіть його спочатку в особистому кабінеті.`
          );
          return;
        }

        // Прив'язуємо Telegram
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: chatId.toString(),
            telegramUsername: username,
            telegramNotifications: true,
          },
        });

        const ortomatInfo = user.doctorOrtomats?.[0]?.ortomat?.name || 'не призначено';

        await this.bot.sendMessage(
          chatId,
          `✅ Telegram успішно прив'язано!\n\n` +
          `👤 Ім'я: ${user.firstName} ${user.lastName}\n` +
          `📧 Email: ${user.email}\n` +
          `🏪 Ортомат: ${ortomatInfo}\n\n` +
          `Тепер ви будете отримувати сповіщення про продажі.\n` +
          `Використовуйте /stats щоб переглянути статистику.`,
        );

        this.logger.log(`🔗 Прив'язано Telegram для ${email}: ${username} (${chatId})`);
      } catch (error) {
        this.logger.error('Помилка прив\'язки Telegram:', error);
        await this.bot.sendMessage(chatId, '❌ Виникла помилка. Спробуйте пізніше.');
      }
    });

    // Команда /stats для перегляду статистики
    this.bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        // Знаходимо користувача за chatId
        const user = await this.prisma.user.findUnique({
          where: { telegramChatId: chatId.toString() },
          include: {
            doctorOrtomats: {
              include: {
                ortomat: true,
              },
            },
          },
        });

        if (!user) {
          await this.bot.sendMessage(
            chatId,
            '❌ Ваш Telegram не прив\'язано до акаунту.\n' +
            'Використовуйте /link для прив\'язки.',
          );
          return;
        }

        const doctorOrtomat = user.doctorOrtomats?.[0];

        if (!doctorOrtomat) {
          await this.bot.sendMessage(
            chatId,
            `📊 Статистика для ${user.firstName} ${user.lastName}\n\n` +
            `⚠️ Ортомат не призначено.\n` +
            `Зверніться до адміністратора.`,
          );
          return;
        }

        // Отримуємо деталі останніх продажів
        const recentSales = await this.prisma.sale.findMany({
          where: {
            doctorOrtomatId: doctorOrtomat.id,
            status: 'completed',
          },
          include: {
            product: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        let statsMessage = `📊 Ваша статистика\n\n`;
        statsMessage += `👤 ${user.firstName} ${user.lastName}\n`;
        statsMessage += `🏪 Ортомат: ${doctorOrtomat.ortomat.name}\n`;
        statsMessage += `📍 ${doctorOrtomat.ortomat.address}\n\n`;
        statsMessage += `💰 Загальна кількість балів: ${doctorOrtomat.totalPoints}\n`;
        statsMessage += `📦 Всього продажів: ${doctorOrtomat.totalSales}\n\n`;

        if (recentSales.length > 0) {
          statsMessage += `🕐 Останні 5 продажів:\n`;
          recentSales.forEach((sale, index) => {
            const date = new Date(sale.createdAt).toLocaleDateString('uk-UA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            statsMessage += `${index + 1}. ${sale.product?.name || 'Товар'} - ${sale.pointsEarned || 0} балів (${date})\n`;
          });
        } else {
          statsMessage += `ℹ️ Поки що немає продажів`;
        }

        await this.bot.sendMessage(chatId, statsMessage);
        this.logger.log(`📊 /stats для ${user.email}`);
      } catch (error) {
        this.logger.error('Помилка отримання статистики:', error);
        await this.bot.sendMessage(chatId, '❌ Виникла помилка. Спробуйте пізніше.');
      }
    });

    // Команда /unlink для відв'язки аккаунту
    this.bot.onText(/\/unlink/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const user = await this.prisma.user.findUnique({
          where: { telegramChatId: chatId.toString() },
        });

        if (!user) {
          await this.bot.sendMessage(chatId, '❌ Ваш Telegram не прив\'язано до акаунту.');
          return;
        }

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: null,
            telegramUsername: null,
            telegramNotifications: false,
          },
        });

        await this.bot.sendMessage(
          chatId,
          `✅ Telegram відв'язано від акаунту ${user.email}.\n` +
          `Ви більше не будете отримувати сповіщення.`,
        );

        this.logger.log(`🔓 Відв'язано Telegram для ${user.email}`);
      } catch (error) {
        this.logger.error('Помилка відв\'язки Telegram:', error);
        await this.bot.sendMessage(chatId, '❌ Виникла помилка. Спробуйте пізніше.');
      }
    });

    // Команда /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;

      const helpMessage = `
📱 Доступні команди:

/start - Запустити бота
/link <email> - Прив'язати Telegram до акаунту
/stats - Переглянути статистику балів
/unlink - Відв'язати Telegram від акаунту
/help - Показати цю довідку

💡 Приклад:
/link doctor@example.com
      `.trim();

      await this.bot.sendMessage(chatId, helpMessage);
    });

    this.logger.log('✅ Команди бота налаштовано');
  }

  /**
   * Відправити повідомлення про новий продаж
   */
  async sendSaleNotification(doctorId: string, saleData: {
    productName: string;
    points: number;
    totalPoints: number;
    amount: number;
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: doctorId },
      });

      if (!user || !user.telegramChatId || !user.telegramNotifications) {
        return;
      }

      const message = `
🎉 Новий продаж!

📦 Товар: ${saleData.productName}
💰 Отримано балів: +${saleData.points}
📊 Всього балів: ${saleData.totalPoints}
💵 Сума продажу: ${saleData.amount} грн

Вітаємо! 🎊
      `.trim();

      await this.bot.sendMessage(user.telegramChatId, message);
      this.logger.log(`📨 Надіслано нотифікацію про продаж для ${user.email}`);
    } catch (error) {
      this.logger.error('Помилка відправки нотифікації:', error);
    }
  }

  /**
   * Відправити кастомне повідомлення користувачу
   */
  async sendMessage(chatId: string, message: string) {
    if (!this.bot) {
      this.logger.warn('Telegram бот не ініціалізовано');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      this.logger.error('Помилка відправки повідомлення:', error);
      throw error;
    }
  }
}
