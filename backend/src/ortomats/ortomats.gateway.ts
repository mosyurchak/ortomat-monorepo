import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface OrtomatDevice {
  deviceId: string;
  socket: Socket;
  connectedAt: Date;
  lastDiag?: {
    uptime_ms: number;
    wifi_rssi: number;
    timestamp: Date;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*', // Для локальної розробки
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class OrtomatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrtomatsGateway.name);
  private devices: Map<string, OrtomatDevice> = new Map();

  // ==================== GATEWAY EVENTS ====================

  handleConnection(client: Socket) {
    const deviceId = client.handshake.query.device_id as string;
    const token = client.handshake.query.token as string;

    this.logger.log(`🔌 Connection attempt from ${deviceId || 'unknown'}`);

    // Валідація токена
    if (!this.validateToken(token)) {
      this.logger.warn(`❌ Invalid token from ${deviceId}`);
      client.disconnect();
      return;
    }

    if (!deviceId) {
      this.logger.warn('❌ Connection without device_id');
      client.disconnect();
      return;
    }

    // Реєстрація пристрою
    this.devices.set(deviceId, {
      deviceId,
      socket: client,
      connectedAt: new Date(),
    });

    this.logger.log(`✅ Ortomat connected: ${deviceId} (${this.devices.size} total)`);
  }

  handleDisconnect(client: Socket) {
    const deviceId = this.findDeviceId(client);
    if (deviceId) {
      this.devices.delete(deviceId);
      this.logger.log(`❌ Ortomat disconnected: ${deviceId} (${this.devices.size} remain)`);
    }
  }

  // ==================== MESSAGE HANDLERS ====================

  @SubscribeMessage('hello')
  handleHello(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`👋 Hello from ${data.device_id}`);
    
    // Відправляємо підтвердження
    client.emit('message', {
      type: 'welcome',
      server_time: Date.now(),
      message: 'Connected to Ortomat Backend',
    });
  }

  @SubscribeMessage('diag')
  handleDiag(@MessageBody() data: any) {
    const device = this.devices.get(data.device_id);
    if (device) {
      device.lastDiag = {
        uptime_ms: data.uptime_ms,
        wifi_rssi: data.wifi_rssi,
        timestamp: new Date(),
      };
      this.logger.debug(`📊 Diag from ${data.device_id}: RSSI=${data.wifi_rssi}`);
    }
  }

  @SubscribeMessage('ack')
  handleAck(@MessageBody() data: any) {
    this.logger.log(`✅ ACK received for cmd: ${data.cmd_id}`);
  }

  @SubscribeMessage('state')
  handleState(@MessageBody() data: any) {
    this.logger.log(
      `📍 Cell ${data.cell} state: ${data.result}, sensor=${data.sensor}`,
    );
    
    // TODO: Можна оновити статус в БД
    // await this.prisma.sale.update(...)
  }

  // ==================== PUBLIC API ====================

  /**
   * Відкрити комірку (викликається з OrdersService)
   */
  async openCell(deviceId: string, cell: number, orderId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      this.logger.error(`❌ Device ${deviceId} not connected`);
      return false;
    }

    const cmd_id = `${orderId}-${Date.now()}`;
    
    const command = {
      type: 'cmd',
      cmd_id,
      action: 'open',
      cell,
      timestamp: Date.now(),
    };

    this.logger.log(`📤 Sending open command to ${deviceId}, cell ${cell}`);
    
    device.socket.emit('message', command);
    
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
    return this.devices.get(deviceId)?.lastDiag;
  }

  // ==================== HELPERS ====================

  private validateToken(token: string): boolean {
    // Для локальної розробки - дозволяємо тестові токени
    const validTokens = ['devtoken-01', 'devtoken-02', 'test-token'];
    return validTokens.includes(token);
  }

  private findDeviceId(client: Socket): string | undefined {
    for (const [deviceId, device] of this.devices.entries()) {
      if (device.socket.id === client.id) {
        return deviceId;
      }
    }
    return undefined;
  }
}