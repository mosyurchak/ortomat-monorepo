import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { OrtomatsGateway } from '../ortomats/ortomats.gateway';

export interface OpenCellParams {
  deviceId: string;
  cellNumber: number;
  ortomatId: string;
  reason: 'sale' | 'refill' | 'admin';
  metadata: {
    orderId?: string;
    orderNumber?: string;
    courierId?: string;
    userId?: string;
    productName?: string;
    action?: string;
  };
}

export interface OpenCellResult {
  success: boolean;
  message: string;
  cellNumber: number;
  mode: 'production' | 'demo';
  deviceId: string;
  ortomatName?: string;
  orderNumber?: string;
  productName?: string;
  note?: string;
}

/**
 * Централізований сервіс для керування відкриттям комірок
 * Уніфікує логіку для продажу, поповнення та адмін-операцій
 */
@Injectable()
export class CellManagementService {
  private readonly logger = new Logger(CellManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly ortomatsGateway: OrtomatsGateway,
  ) {}

  /**
   * Відкриває комірку з уніфікованою логікою
   * Використовується для продажу, поповнення та адміністративних операцій
   */
  async openCell(params: OpenCellParams): Promise<OpenCellResult> {
    const { deviceId, cellNumber, ortomatId, reason, metadata } = params;

    this.logger.log(`🔐 Opening cell #${cellNumber} (reason: ${reason})`);

    // Отримуємо інформацію про ортомат та комірку
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
      include: {
        ortomat: true,
        product: true,
      },
    });

    if (!cell) {
      throw new Error('Cell not found');
    }

    const ortomatName = cell.ortomat.name;

    // Перевірка чи пристрій онлайн
    const isOnline = this.ortomatsGateway.isDeviceOnline(deviceId);
    const mode: 'production' | 'demo' = isOnline ? 'production' : 'demo';

    if (!isOnline) {
      this.logger.warn(`⚠️ Device ${ortomatName} (${deviceId}) offline, using DEMO mode`);
    } else {
      this.logger.log(`🔌 Sending WebSocket command to ${ortomatName} (${deviceId})`);
    }

    // Відкриття комірки через WebSocket (якщо онлайн)
    if (isOnline) {
      const commandId = this.generateCommandId(reason, metadata);
      const success = await this.ortomatsGateway.openCell(
        deviceId,
        cellNumber,
        commandId,
      );

      if (!success) {
        throw new Error('Failed to send command to ortomat');
      }

      this.logger.log(`✅ WebSocket command sent to ${deviceId}, cell ${cellNumber}`);
    }

    // Оновлення статусу комірки в БД
    await this.updateCellStatus(ortomatId, cellNumber, reason);

    // Логування відкриття комірки
    await this.logCellOpening(params, cell, mode);

    // Формування результату
    return this.buildResult(params, cell, mode);
  }

  /**
   * Оновлює статус комірки в залежності від причини відкриття
   */
  private async updateCellStatus(
    ortomatId: string,
    cellNumber: number,
    reason: 'sale' | 'refill' | 'admin',
  ): Promise<void> {
    const updateData: any = {};

    if (reason === 'sale') {
      // Після продажу: комірка порожня, але товар призначений
      updateData.isAvailable = true; // true = порожня (синя)
      this.logger.log(`✅ Cell #${cellNumber} marked as empty (product dispensed)`);
    } else if (reason === 'refill') {
      // При поповненні: очищаємо статус для повторного заповнення
      updateData.isAvailable = true;
      updateData.lastRefillDate = null;
      this.logger.log(`✅ Cell #${cellNumber} prepared for refill`);
    } else if (reason === 'admin') {
      // Адмін операція: просто відкриваємо
      this.logger.log(`✅ Cell #${cellNumber} opened by admin`);
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.cell.update({
        where: {
          ortomatId_number: {
            ortomatId,
            number: cellNumber,
          },
        },
        data: updateData,
      });
    }
  }

  /**
   * Логування відкриття комірки
   */
  private async logCellOpening(
    params: OpenCellParams,
    cell: any,
    mode: 'production' | 'demo',
  ): Promise<void> {
    const { cellNumber, ortomatId, reason, metadata } = params;

    const reasonMessages = {
      sale: `Opening cell #${cellNumber} for sale order ${metadata.orderNumber}`,
      refill: `Opening cell #${cellNumber} for refill (${metadata.action || 'refill'})`,
      admin: `Opening cell #${cellNumber} by admin`,
    };

    // Визначаємо правильний LogType в залежності від причини
    const logTypeMap = {
      sale: 'WEBSOCKET_COMMAND',
      refill: 'COURIER_REFILL',
      admin: 'CELL_OPENED',
    } as const;

    await this.logsService.createLog({
      type: logTypeMap[reason],
      category: 'system',
      message: reasonMessages[reason] || `Opening cell #${cellNumber}`,
      ortomatId,
      cellNumber,
      userId: metadata.userId || metadata.courierId,
      metadata: {
        ...metadata,
        deviceId: params.deviceId,
        mode,
        ortomatName: cell.ortomat.name,
        productId: cell.productId,
        productName: cell.product?.name,
        reason,
      },
      severity: 'INFO',
    });
  }

  /**
   * Генерує унікальний ID команди
   */
  private generateCommandId(
    reason: string,
    metadata: OpenCellParams['metadata'],
  ): string {
    if (reason === 'sale' && metadata.orderId) {
      return metadata.orderId;
    }

    const prefix = reason.toUpperCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);

    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Формує результат відкриття комірки
   */
  private buildResult(
    params: OpenCellParams,
    cell: any,
    mode: 'production' | 'demo',
  ): OpenCellResult {
    const { cellNumber, deviceId, reason, metadata } = params;

    const result: OpenCellResult = {
      success: true,
      message:
        mode === 'demo'
          ? `Cell ${cellNumber} opened successfully (DEMO mode)`
          : `Cell ${cellNumber} opening command sent via WebSocket`,
      cellNumber,
      mode,
      deviceId,
      ortomatName: cell.ortomat.name,
      productName: cell.product?.name,
    };

    // Додаткова інформація в залежності від причини
    if (reason === 'sale') {
      result.orderNumber = metadata.orderNumber;
      if (mode === 'demo') {
        result.note =
          '🎭 DEMO MODE: ESP32 device is not connected. In production with connected hardware, the physical cell lock would open automatically.';
      }
    }

    if (reason === 'refill') {
      result.note =
        metadata.action === 'cleared'
          ? 'Cell is now empty (blue) but product is still assigned'
          : 'Please place the product inside and close the cell';
    }

    return result;
  }
}
