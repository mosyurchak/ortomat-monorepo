import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogType, Severity } from '@prisma/client';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private prisma: PrismaService) {}

  // ✅ Створити лог
  async createLog(data: {
    type: LogType;
    category: string;
    message: string;
    metadata?: any;
    userId?: string;
    ortomatId?: string;
    cellNumber?: number;
    severity?: Severity;
  }) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          ...data,
          severity: data.severity || 'INFO',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create activity log: ${error.message}`);
      // Не кидаємо помилку, щоб не ламати основний функціонал
    }
  }

  // ✅ Отримати всі логи (з фільтрами)
  async getLogs(filters?: {
    type?: LogType;
    category?: string;
    severity?: Severity;
    ortomatId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.ortomatId) where.ortomatId = filters.ortomatId;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          ortomat: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filters?.limit || 100,
      offset: filters?.offset || 0,
    };
  }

  // ✅ Отримати статистику логів
  async getLogsStats(filters?: {
    ortomatId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.ortomatId) where.ortomatId = filters.ortomatId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [
      totalLogs,
      byType,
      bySeverity,
      byCategory,
    ] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.activityLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      this.prisma.activityLog.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalLogs,
      byType,
      bySeverity,
      byCategory,
    };
  }

  // ✅ Видалити старі логи (для очищення)
  async cleanOldLogs(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        severity: {
          in: ['INFO', 'WARNING'], // Не видаляємо критичні помилки
        },
      },
    });

    return {
      success: true,
      deleted: deleted.count,
      message: `Deleted ${deleted.count} logs older than ${daysToKeep} days`,
    };
  }

  // ✅ Хелпери для швидкого логування

  async logCellOpened(data: {
    cellNumber: number;
    ortomatId: string;
    userId: string;
    reason: string;
    metadata?: any;
  }) {
    // Отримуємо назву ортомату для читабельного логу
    const ortomat = await this.prisma.ortomat.findUnique({
      where: { id: data.ortomatId },
      select: { name: true },
    });

    const ortomatName = ortomat?.name || data.ortomatId;
    const productName = data.metadata?.productName || 'товар';

    return this.createLog({
      type: 'CELL_OPENED',
      category: 'cells',
      message: `${ortomatName}, комірка #${data.cellNumber} відкрита: ${productName}`,
      cellNumber: data.cellNumber,
      ortomatId: data.ortomatId,
      userId: data.userId,
      metadata: {
        ...data.metadata,
        ortomatName,
        reason: data.reason,
      },
      severity: 'INFO',
    });
  }

  async logOrderCreated(data: {
    orderId: string;
    amount: number;
    productId: string;
    ortomatId: string;
    userId?: string;
  }) {
    return this.createLog({
      type: 'ORDER_CREATED',
      category: 'orders',
      message: `Order created: ${data.amount} UAH`,
      ortomatId: data.ortomatId,
      userId: data.userId,
      metadata: {
        orderId: data.orderId,
        amount: data.amount,
        productId: data.productId,
      },
      severity: 'INFO',
    });
  }

  async logPaymentSuccess(data: {
    orderId: string;
    amount: number;
    ortomatId: string;
  }) {
    return this.createLog({
      type: 'PAYMENT_SUCCESS',
      category: 'orders',
      message: `Payment successful: ${data.amount} UAH`,
      ortomatId: data.ortomatId,
      metadata: {
        orderId: data.orderId,
        amount: data.amount,
      },
      severity: 'INFO',
    });
  }

  async logPaymentFailed(data: {
    orderId: string;
    amount: number;
    reason: string;
    ortomatId: string;
  }) {
    return this.createLog({
      type: 'PAYMENT_FAILED',
      category: 'orders',
      message: `Payment failed: ${data.reason}`,
      ortomatId: data.ortomatId,
      metadata: {
        orderId: data.orderId,
        amount: data.amount,
        reason: data.reason,
      },
      severity: 'WARNING',
    });
  }

  async logCourierRefill(data: {
    cellNumber: number;
    ortomatId: string;
    courierId: string;
    productId: string;
  }) {
    // Отримуємо деталі для читабельного логу
    const [ortomat, product] = await Promise.all([
      this.prisma.ortomat.findUnique({
        where: { id: data.ortomatId },
        select: { name: true },
      }),
      this.prisma.product.findUnique({
        where: { id: data.productId },
        select: { name: true, sku: true },
      }),
    ]);

    const ortomatName = ortomat?.name || data.ortomatId;
    const productName = product?.name || 'товар';
    const productSku = product?.sku || '';

    return this.createLog({
      type: 'COURIER_REFILL',
      category: 'couriers',
      message: `${ortomatName}, комірка #${data.cellNumber} заповнена: ${productName} (${productSku})`,
      cellNumber: data.cellNumber,
      ortomatId: data.ortomatId,
      userId: data.courierId,
      metadata: {
        productId: data.productId,
        productName,
        productSku,
        ortomatName,
      },
      severity: 'INFO',
    });
  }

  async logDeviceStatus(data: {
    deviceId: string;
    status: 'online' | 'offline';
    ortomatId?: string;
  }) {
    return this.createLog({
      type: data.status === 'online' ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE',
      category: 'system',
      message: `Device ${data.deviceId} is ${data.status}`,
      ortomatId: data.ortomatId,
      metadata: {
        deviceId: data.deviceId,
      },
      severity: data.status === 'offline' ? 'WARNING' : 'INFO',
    });
  }

  async logError(data: {
    message: string;
    error: any;
    category: string;
    ortomatId?: string;
    userId?: string;
  }) {
    return this.createLog({
      type: 'API_ERROR',
      category: data.category,
      message: data.message,
      ortomatId: data.ortomatId,
      userId: data.userId,
      metadata: {
        error: data.error?.message || data.error,
        stack: data.error?.stack,
      },
      severity: 'ERROR',
    });
  }
}