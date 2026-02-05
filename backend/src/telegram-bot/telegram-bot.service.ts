import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import TelegramBot = require('node-telegram-bot-api');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN не встановлено. Telegram бот не буде запущено.');
      return;
    }

    // Запускаємо бот з retry механізмом
    this.startBotWithRetry(token);
  }

  /**
   * Запуск бота з retry механізмом для уникнення 409 конфліктів
   */
  private async startBotWithRetry(token: string, retryCount = 0) {
    const maxRetries = 5;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff до 30 сек

    try {
      // Якщо бот вже існує - спочатку зупиняємо та очищаємо
      if (this.bot) {
        try {
          await this.bot.stopPolling();
          this.bot.removeAllListeners('polling_error');
        } catch (e) {
          // Ігноруємо помилки
        }
      }

      this.bot = new TelegramBot(token, {
        polling: {
          interval: 300,
          autoStart: false, // Не запускаємо автоматично
          params: {
            timeout: 10,
          },
        },
      });

      let pollingErrorHandled = false;

      // Обробка помилок polling (тільки один раз)
      this.bot.once('polling_error', async (error) => {
        if (pollingErrorHandled) {
          return;
        }
        pollingErrorHandled = true;

        const errorMessage = error.message || '';

        // Якщо 409 Conflict - інший інстанс ще працює
        if (errorMessage.includes('409') && errorMessage.includes('Conflict')) {
          if (retryCount === 0) {
            this.logger.warn('⚠️ 409 Conflict: виявлено конфлікт з іншим інстансом Telegram бота.');
            this.logger.warn('   Можливі причини: Railway horizontal scaling, локальна розробка + production, або старий контейнер ще не вимкнувся.');
          }
          this.logger.debug(`   Спроба ${retryCount + 1}/${maxRetries}, очікування ${retryDelay / 1000}с...`);

          // Зупиняємо поточний polling
          try {
            await this.bot.stopPolling();
            this.bot.removeAllListeners('polling_error');
          } catch (e) {
            // Ігноруємо помилки зупинки
          }

          // Retry через затримку
          if (retryCount < maxRetries) {
            setTimeout(() => {
              this.startBotWithRetry(token, retryCount + 1);
            }, retryDelay);
          } else {
            this.logger.error('❌ Досягнуто максимальну кількість спроб запуску бота');
            this.logger.error('   Перевірте чи немає іншого запущеного інстансу backend з тим самим TELEGRAM_BOT_TOKEN');
          }
        } else {
          // Інша помилка - просто логуємо
          this.logger.error('❌ Помилка polling:', errorMessage);
        }
      });

      // Запускаємо polling вручну
      await this.bot.startPolling();

      this.logger.log('✅ Telegram бот успішно запущено');
      this.setupCommands();
    } catch (error) {
      this.logger.error('❌ Помилка запуску Telegram бота:', error.message);

      // Retry при помилці запуску
      if (retryCount < maxRetries) {
        this.logger.log(`⏳ Очікування ${retryDelay / 1000} секунд перед наступною спробою...`);
        setTimeout(() => {
          this.startBotWithRetry(token, retryCount + 1);
        }, retryDelay);
      }
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      try {
        this.logger.log('🛑 Зупинка Telegram бота...');
        await this.bot.stopPolling();
        await this.bot.close();
        this.logger.log('✅ Telegram бот зупинено');
      } catch (error) {
        this.logger.error('❌ Помилка зупинки бота:', error);
      }
    }
  }

  /**
   * Нормалізує номер телефону до формату +380XXXXXXXXX
   */
  private normalizePhone(phone: string): string | null {
    // Видаляємо всі нецифрові символи
    let digits = phone.replace(/\D/g, '');

    // Якщо починається з 380, додаємо +
    if (digits.startsWith('380') && digits.length === 12) {
      return '+' + digits;
    }

    // Якщо починається з 0 (український формат)
    if (digits.startsWith('0') && digits.length === 10) {
      return '+38' + digits;
    }

    // Якщо 9 цифр - додаємо 0 на початок
    if (digits.length === 9) {
      return '+380' + digits;
    }

    return null; // Невалідний формат
  }

  private setupCommands() {
    // Команда /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from?.username;

      // Перевіряємо чи вже прив'язано
      const existingUser = await this.prisma.user.findUnique({
        where: { telegramChatId: chatId.toString() },
      });

      if (existingUser) {
        await this.bot.sendMessage(
          chatId,
          `✅ Ваш Telegram вже прив'язано!\n\n` +
          `👤 ${existingUser.firstName} ${existingUser.lastName}\n` +
          `📱 ${existingUser.phone}\n\n` +
          `Використовуйте /stats для перегляду статистики.`
        );
        return;
      }

      // Показуємо кнопку для прив'язки
      await this.bot.sendMessage(
        chatId,
        `👋 Вітаю в Ortomat Referral Bot!\n\n` +
        `Цей бот допоможе вам:\n` +
        `• 📊 Переглядати вашу статистику балів\n` +
        `• 💰 Отримувати сповіщення про нові продажі\n\n` +
        `Для початку роботи натисніть кнопку нижче 👇`,
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: '📱 Прив\'язати через номер телефону',
                  request_contact: true,
                }
              ]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        }
      );

      this.logger.log(`📱 /start від користувача ${username} (${chatId})`);
    });

    // Обробка контакту (номера телефону)
    this.bot.on('contact', async (msg) => {
      const chatId = msg.chat.id;
      const contact = msg.contact;
      const username = msg.from?.username;

      if (!contact || !contact.phone_number) {
        await this.bot.sendMessage(chatId, '❌ Не вдалося отримати номер телефону.');
        return;
      }

      try {
        // Нормалізуємо номер телефону
        const normalizedPhone = this.normalizePhone(contact.phone_number);

        if (!normalizedPhone) {
          await this.bot.sendMessage(
            chatId,
            '❌ Невірний формат номера телефону.\n\n' +
            'Ваш номер: ' + contact.phone_number
          );
          return;
        }

        this.logger.log(`📞 Отримано номер: ${contact.phone_number} → ${normalizedPhone}`);

        // Шукаємо користувача за номером телефону
        // Оскільки в БД номери можуть бути в форматі "+38 (068) 836-77-62"
        // а ми шукаємо "+380688367762", використаємо findMany і порівняємо нормалізовані номери
        const allDoctors = await this.prisma.user.findMany({
          where: {
            role: 'DOCTOR',
          },
          include: {
            doctorOrtomats: {
              include: {
                ortomat: true,
              },
            },
          },
        });

        // Знаходимо лікаря з таким самим нормалізованим номером
        const user = allDoctors.find(doctor => {
          const dbPhoneNormalized = this.normalizePhone(doctor.phone);
          return dbPhoneNormalized === normalizedPhone;
        });

        if (!user) {
          await this.bot.sendMessage(
            chatId,
            `❌ Користувача з номером ${normalizedPhone} не знайдено в системі.\n\n` +
            `Переконайтеся що ви зареєстровані як лікар-реферал.`,
            {
              reply_markup: {
                remove_keyboard: true,
              }
            }
          );
          return;
        }

        if (user.role !== 'DOCTOR') {
          await this.bot.sendMessage(
            chatId,
            `❌ Цей сервіс доступний тільки для лікарів-рефералів.\n\n` +
            `Ваша роль: ${user.role}`,
            {
              reply_markup: {
                remove_keyboard: true,
              }
            }
          );
          return;
        }

        // Перевіряємо чи не прив'язаний вже інший Telegram
        if (user.telegramChatId && user.telegramChatId !== chatId.toString()) {
          await this.bot.sendMessage(
            chatId,
            `⚠️ До цього акаунту вже прив'язано інший Telegram.\n\n` +
            `Якщо це помилка - зверніться до адміністратора.`,
            {
              reply_markup: {
                remove_keyboard: true,
              }
            }
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
          `📱 Телефон: ${user.phone}\n` +
          `🏪 Ортомат: ${ortomatInfo}\n\n` +
          `Тепер ви будете отримувати сповіщення про продажі.\n` +
          `Використовуйте /stats щоб переглянути статистику.`,
          {
            reply_markup: {
              remove_keyboard: true,
            }
          }
        );

        this.logger.log(`🔗 Прив'язано Telegram для ${user.phone}: ${username} (${chatId})`);
      } catch (error) {
        this.logger.error('Помилка прив\'язки Telegram:', error);
        await this.bot.sendMessage(
          chatId,
          '❌ Виникла помилка. Спробуйте пізніше.',
          {
            reply_markup: {
              remove_keyboard: true,
            }
          }
        );
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
        this.logger.log(`📊 /stats для ${user.email || user.phone || user.id}`);
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
          `✅ Telegram відв'язано від акаунту ${user.email || user.phone || 'вашого профілю'}.\n` +
          `Ви більше не будете отримувати сповіщення.`,
        );

        this.logger.log(`🔓 Відв'язано Telegram для ${user.email || user.phone || user.id}`);
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

/start - Запустити бота та прив'язати акаунт
/stats - Переглянути статистику балів
/unlink - Відв'язати Telegram від акаунту
/help - Показати цю довідку

💡 Як прив'язати акаунт:
1. Натисніть /start
2. Натисніть кнопку "📱 Прив'язати через номер телефону"
3. Telegram запросить дозвіл поділитися номером
4. Підтвердіть - і готово!
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
      this.logger.log(`📨 Надіслано нотифікацію про продаж для ${user.email || user.phone || user.id}`);
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
