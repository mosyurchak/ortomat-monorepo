import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Logger, Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import { PrismaService } from '../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';

interface OrtomatDevice {
  deviceId: string;
  socket: WebSocket;
  connectedAt: Date;
  lastPing?: Date;
  lastDiag?: {
    uptime_ms: number;
    wifi_rssi: number;
    timestamp: Date;
  };
}

@Injectable()
@WebSocketGateway({
  path: '/ws',
})
export class OrtomatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrtomatsGateway.name);
  private devices: Map<string, OrtomatDevice> = new Map();

  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  // ==================== GATEWAY EVENTS ====================

  handleConnection(client: WebSocket, request: any) {
    // Отримуємо параметри з URL query
    const url = new URL(request.url, `ws://${request.headers.host}`);
    const deviceId = url.searchParams.get('device_id');
    const token = url.searchParams.get('token');

    this.logger.log(`🔌 Connection attempt from ${deviceId || 'unknown'}`);

    // Валідація токена
    if (!this.validateToken(token)) {
      this.logger.warn(`❌ Invalid token from ${deviceId}`);
      client.close(1008, 'Invalid token');
      return;
    }

    if (!deviceId) {
      this.logger.warn('❌ Connection without device_id');
      client.close(1008, 'Missing device_id');
      return;
    }

    // Реєстрація пристрою
    this.devices.set(deviceId, {
      deviceId,
      socket: client,
      connectedAt: new Date(),
      lastPing: new Date(),
    });

    this.logger.log(`✅ Ortomat connected: ${deviceId} (${this.devices.size} total)`);

    // Обробка вхідних повідомлень
    client.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(deviceId, message, client);
      } catch (error) {
        this.logger.error(`❌ Invalid JSON from ${deviceId}: ${error.message}`);
      }
    });

    // Обробка помилок
    client.on('error', (error) => {
      this.logger.error(`❌ WebSocket error from ${deviceId}:`, error);
    });

    // Ping/Pong для keepalive
    client.on('pong', () => {
      const device = this.devices.get(deviceId);
      if (device) {
        device.lastPing = new Date();
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    const deviceId = this.findDeviceId(client);
    if (deviceId) {
      this.devices.delete(deviceId);
      this.logger.log(`❌ Ortomat disconnected: ${deviceId} (${this.devices.size} remain)`);
    }
  }

  // ==================== MESSAGE HANDLERS ====================

  private handleMessage(deviceId: string, message: any, client: WebSocket) {
    const { type } = message;

    switch (type) {
      case 'hello':
        this.handleHello(deviceId, message, client);
        break;
      
      case 'diag':
        this.handleDiag(deviceId, message);
        break;
      
      case 'ack':
        this.handleAck(deviceId, message);
        break;
      
      case 'state':
        this.handleState(deviceId, message);
        break;
      
      default:
        this.logger.debug(`⚠️ Unknown message type from ${deviceId}: ${type}`);
    }
  }

  private handleHello(deviceId: string, data: any, client: WebSocket) {
    this.logger.log(`👋 Hello from ${deviceId}, uptime: ${data.ts_ms}ms`);
    
    // ESP32 не потребує відповіді на hello, але можна відправити message
    this.sendMessage(client, {
      type: 'message',
      server_time: Date.now(),
      message: 'Connected to Ortomat Backend',
    });
  }

  private handleDiag(deviceId: string, data: any) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastDiag = {
        uptime_ms: data.uptime_ms,
        wifi_rssi: data.wifi_rssi,
        timestamp: new Date(),
      };
      this.logger.debug(
        `📊 Diag from ${deviceId}: RSSI=${data.wifi_rssi}dBm, Uptime=${Math.floor(data.uptime_ms / 1000)}s`,
      );
    }
  }

  private async handleAck(deviceId: string, data: any) {
    this.logger.log(`✅ ACK from ${deviceId} for cmd: ${data.cmd_id}`);

    const { cmd_id } = data;

    if (!cmd_id) {
      this.logger.warn('⚠️ ACK received without cmd_id');
      return;
    }

    try {
      // Оновлюємо статус замовлення на "processing" коли ESP32 підтвердив отримання команди
      const sale = await this.prisma.sale.updateMany({
        where: {
          orderNumber: cmd_id,
          status: 'pending'
        },
        data: {
          status: 'processing'
        }
      });

      if (sale.count > 0) {
        this.logger.log(`📝 Sale ${cmd_id} status updated to PROCESSING`);

        // Логуємо зміну статусу
        await this.logsService.createLog({
          type: 'PAYMENT_INITIATED',
          category: 'orders',
          message: `Замовлення ${cmd_id} підтверджено пристроєм ${deviceId}`,
          metadata: {
            orderNumber: cmd_id,
            deviceId,
            status: 'processing',
          },
          severity: 'INFO',
        });
      } else {
        this.logger.warn(`⚠️ Sale ${cmd_id} not found or already processed`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to update sale ${cmd_id}: ${error.message}`);
    }
  }

  private async handleState(deviceId: string, data: any) {
    const { cmd_id, cell, result, sensor } = data;

    this.logger.log(
      `🔍 State from ${deviceId}: Cell ${cell}, Result: ${result}, Sensor: ${sensor}`,
    );

    if (!cmd_id) {
      this.logger.warn('⚠️ State received without cmd_id');
      return;
    }

    try {
      // Коли комірка успішно відкрилась - позначаємо замовлення як виконане
      if (result === 'opened') {
        const sale = await this.prisma.sale.updateMany({
          where: {
            orderNumber: cmd_id,
            status: { in: ['pending', 'processing'] }
          },
          data: {
            status: 'completed',
            completedAt: new Date()
          }
        });

        if (sale.count > 0) {
          this.logger.log(`✅ Sale ${cmd_id} COMPLETED - Cell ${cell} opened successfully`);

          // Логуємо успішне завершення замовлення
          const saleData = await this.prisma.sale.findUnique({
            where: { orderNumber: cmd_id },
            include: {
              ortomat: { select: { id: true, name: true } },
              product: { select: { name: true } },
            },
          });

          if (saleData) {
            await this.logsService.createLog({
              type: 'ORDER_COMPLETED',
              category: 'orders',
              message: `Замовлення ${cmd_id} виконано: ${saleData.product?.name || 'товар'} з комірки ${cell}`,
              ortomatId: saleData.ortomatId,
              cellNumber: cell,
              metadata: {
                orderNumber: cmd_id,
                deviceId,
                cellNumber: cell,
                productName: saleData.product?.name,
                amount: saleData.amount,
                sensor,
              },
              severity: 'INFO',
            });
          }
        } else {
          this.logger.warn(`⚠️ Sale ${cmd_id} not found or already completed`);
        }
      } else if (result === 'failed' || result === 'error') {
        // Якщо відкриття не вдалось - позначаємо як невдале
        const sale = await this.prisma.sale.updateMany({
          where: {
            orderNumber: cmd_id,
            status: { in: ['pending', 'processing'] }
          },
          data: {
            status: 'failed'
          }
        });

        if (sale.count > 0) {
          this.logger.error(`❌ Sale ${cmd_id} FAILED - Cell ${cell} could not be opened`);

          // Логуємо невдале виконання замовлення
          const saleData = await this.prisma.sale.findUnique({
            where: { orderNumber: cmd_id },
            include: {
              ortomat: { select: { id: true, name: true } },
              product: { select: { name: true } },
            },
          });

          if (saleData) {
            await this.logsService.createLog({
              type: 'ORDER_CANCELLED',
              category: 'orders',
              message: `Замовлення ${cmd_id} не виконано: помилка відкриття комірки ${cell}`,
              ortomatId: saleData.ortomatId,
              cellNumber: cell,
              metadata: {
                orderNumber: cmd_id,
                deviceId,
                cellNumber: cell,
                productName: saleData.product?.name,
                result,
                sensor,
                reason: 'cell_open_failed',
              },
              severity: 'ERROR',
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to update sale ${cmd_id}: ${error.message}`);
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Відкрити комірку (викликається з OrdersService)
   * ESP32 очікує формат: {"type":"cmd","cmd_id":"...","action":"open","cell":1,"timestamp":...}
   */
  async openCell(deviceId: string, cell: number, orderId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      this.logger.error(`❌ Device ${deviceId} not connected`);
      return false;
    }

    const cmd_id = orderId; // Використовуємо orderId як cmd_id
    
    const command = {
      type: 'cmd',
      cmd_id,
      action: 'open',
      cell,
      cellNumber: cell, // ESP32 може читати обидва варіанти
      timestamp: Date.now(),
    };

    this.logger.log(`📤 Sending open command to ${deviceId}, cell ${cell}, cmd_id: ${cmd_id}`);
    
    this.sendMessage(device.socket, command);
    
    return true;
  }

  /**
   * Перевірити чи пристрій онлайн
   */
  isDeviceOnline(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  /**
   * Отримати список підключених пристроїв
   */
  getConnectedDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  /**
   * Отримати діагностику пристрою
   */
  getDeviceDiag(deviceId: string) {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    return {
      deviceId: device.deviceId,
      connectedAt: device.connectedAt,
      lastPing: device.lastPing,
      uptime_ms: device.lastDiag?.uptime_ms,
      wifi_rssi: device.lastDiag?.wifi_rssi,
      lastDiagAt: device.lastDiag?.timestamp,
    };
  }

  /**
   * Broadcast повідомлення всім пристроям
   */
  broadcastMessage(message: any) {
    const payload = JSON.stringify(message);
    this.devices.forEach((device) => {
      if (device.socket.readyState === WebSocket.OPEN) {
        device.socket.send(payload);
      }
    });
  }

  /**
   * Отримати статистику всіх пристроїв
   */
  getAllDevicesStats() {
    return Array.from(this.devices.values()).map((device) => ({
      deviceId: device.deviceId,
      connectedAt: device.connectedAt,
      uptime_ms: device.lastDiag?.uptime_ms,
      wifi_rssi: device.lastDiag?.wifi_rssi,
      lastDiagAt: device.lastDiag?.timestamp,
    }));
  }

  // ==================== HELPERS ====================

  private sendMessage(client: WebSocket, message: any) {
    if (client.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify(message);
      client.send(payload);
      this.logger.debug(`📤 Sent to device: ${payload}`);
    }
  }

  private validateToken(token: string): boolean {
    // Дозволяємо тестові токени та токени ESP32
    const validTokens = [
      'devtoken-01', 
      'devtoken-02', 
      'test-token'
    ];
    
    // Дозволяємо будь-який токен що починається з esp32-
    if (token?.startsWith('esp32-')) return true;
    
    return validTokens.includes(token);
  }

  private findDeviceId(client: WebSocket): string | undefined {
    for (const [deviceId, device] of this.devices.entries()) {
      if (device.socket === client) {
        return deviceId;
      }
    }
    return undefined;
  }
}