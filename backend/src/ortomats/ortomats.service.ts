import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OrtomatsGateway } from './ortomats.gateway';

@Injectable()
export class OrtomatsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OrtomatCreateInput) {
    const ortomat = await this.prisma.ortomat.create({
      data,
    });

    // Створюємо комірки
    const cells = Array.from({ length: data.totalCells || 37 }, (_, i) => ({
      number: i + 1,
      ortomatId: ortomat.id,
      isAvailable: true, // Порожні комірки
    }));

    await this.prisma.cell.createMany({
      data: cells,
    });

    return ortomat;
  }

  async findAll() {
    return this.prisma.ortomat.findMany({
      include: {
        cells: {
          include: {
            product: true,
          },
          orderBy: {
            number: 'asc',
          },
        },
        doctors: {
          include: {
            doctor: true,
          },
        },
        couriers: {
          include: {
            courier: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.ortomat.findUnique({
      where: { id },
      include: {
        cells: {
          include: {
            product: true,
          },
          orderBy: {
            number: 'asc',
          },
        },
        doctors: {
          include: {
            doctor: true,
          },
        },
        couriers: {
          include: {
            courier: true,
          },
        },
      },
    });
  }

  async findByReferralCode(referralCode: string) {
    const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
      where: { referralCode },
      include: {
        ortomat: {
          include: {
            cells: {
              include: {
                product: true,
              },
              orderBy: {
                number: 'asc',
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });

    return doctorOrtomat;
  }

  async getCatalogWithAvailability(ortomatId: string, referralCode?: string) {
    const ortomat = await this.prisma.ortomat.findUnique({
      where: { id: ortomatId },
      include: {
        cells: {
          where: {
            productId: {
              not: null,
            },
            isAvailable: false, // Тільки заповнені комірки
          },
          include: {
            product: true,
          },
          orderBy: {
            number: 'asc',
          },
        },
      },
    });

    let doctor = null;
    if (referralCode) {
      const doctorOrtomat = await this.prisma.doctorOrtomat.findUnique({
        where: { referralCode },
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
            },
          },
        },
      });
      doctor = doctorOrtomat?.doctor;
    }

    // Group cells by product
    const productsMap = new Map();
    
    ortomat.cells.forEach(cell => {
      if (cell.product) {
        if (!productsMap.has(cell.product.id)) {
          productsMap.set(cell.product.id, {
            ...cell.product,
            availableCells: [],
            quantity: 0,
          });
        }
        const productData = productsMap.get(cell.product.id);
        productData.availableCells.push(cell.number);
        productData.quantity++;
      }
    });

    return {
      ortomat: {
        id: ortomat.id,
        name: ortomat.name,
        address: ortomat.address,
        city: ortomat.city,
      },
      products: Array.from(productsMap.values()),
      doctor,
      referralCode,
    };
  }

  async update(id: string, data: Prisma.OrtomatUpdateInput) {
    return this.prisma.ortomat.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.ortomat.delete({
      where: { id },
    });
  }

  async assignDoctor(ortomatId: string, doctorId: string, commissionPercent = 10.0) {
    const referralCode = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return this.prisma.doctorOrtomat.create({
      data: {
        ortomatId,
        doctorId,
        referralCode,
        commissionPercent,
      },
      include: {
        doctor: true,
        ortomat: true,
      },
    });
  }

  async assignCourier(ortomatId: string, courierId: string) {
    return this.prisma.courierOrtomat.create({
      data: {
        ortomatId,
        courierId,
      },
      include: {
        courier: true,
        ortomat: true,
      },
    });
  }

  async openCell(ortomatId: string, cellNumber: number) {
    // Integration with physical ortomat would go here
    return { success: true, message: `Cell ${cellNumber} opened` };
  }

  // ✅ ВИПРАВЛЕНО: Призначити товар до комірки (для адміна)
  // СІРА → СИНЯ: призначити товар (isAvailable залишається TRUE)
  // СИНЯ → СИНЯ: змінити товар (isAvailable залишається TRUE)
  async updateCellProduct(ortomatId: string, cellNumber: number, productId: string | null) {
    // Перевіряємо чи існує комірка
    let cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
    });

    // Якщо комірки немає - створюємо її
    if (!cell) {
      cell = await this.prisma.cell.create({
        data: {
          number: cellNumber,
          ortomatId,
          productId,
          isAvailable: true, // ✅ Завжди TRUE при призначенні товару (СИНЯ)
        },
      });
      
      return this.prisma.cell.findUnique({
        where: { id: cell.id },
        include: { product: true },
      });
    }

    // Якщо комірка існує - оновлюємо
    // ✅ ВИПРАВЛЕНО: isAvailable завжди TRUE при зміні productId
    // Тобто комірка стає або залишається СИНЬОЮ (порожня з товаром)
    return this.prisma.cell.update({
      where: { id: cell.id },
      data: {
        productId,
        // ✅ КРИТИЧНО: При призначенні/зміні товару комірка стає СИНЬОЮ (isAvailable: true)
        // При видаленні товару (productId: null) комірка стає СІРОЮ (isAvailable: true)
        isAvailable: true,
      },
      include: {
        product: true,
      },
    });
  }

  // ✅ Отримати інвентар (для кур'єра)
  async getInventory(ortomatId: string) {
    const cells = await this.prisma.cell.findMany({
      where: { ortomatId },
      include: {
        product: true,
      },
      orderBy: {
        number: 'asc',
      },
    });

    return cells.map(cell => ({
      id: cell.id,
      number: cell.number,
      isAvailable: cell.isAvailable, // true = порожня (синя/сіра), false = заповнена (зелена)
      lastRefillDate: cell.lastRefillDate,
      productId: cell.productId,
      product: cell.product ? {
        id: cell.product.id,
        name: cell.product.name,
        size: cell.product.size,
        price: cell.product.price,
      } : null,
    }));
  }

  // ✅ ВИПРАВЛЕНО: Відкрити комірку для поповнення (кур'єр) + WebSocket
  async openCellForRefill(
    ortomatId: string, 
    cellNumber: number, 
    courierId: string, 
    gateway?: OrtomatsGateway
  ) {
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
      include: {
        product: true,
        ortomat: true,
      },
    });

    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    if (!cell.productId) {
      throw new BadRequestException('No product assigned to this cell by admin.');
    }

    // Визначаємо дію: очищення або заповнення
    const action = !cell.isAvailable ? 'cleared' : 'opened';
    
    // Оновлюємо БД
    if (!cell.isAvailable) {
      // ЗЕЛЕНА → СИНЯ: очищуємо заповнену комірку
      await this.prisma.cell.update({
        where: { id: cell.id },
        data: {
          isAvailable: true, // Робимо порожньою (СИНЯ)
          lastRefillDate: null,
        },
      });
    }

    // 🔥 ДОДАНО: Відправляємо команду через WebSocket
    const deviceId = 'locker-01'; // TODO: cell.ortomat.deviceId в майбутньому
    
    if (gateway) {
      const isOnline = gateway.isDeviceOnline(deviceId);
      
      if (isOnline) {
        console.log(`📤 Sending WebSocket command to ${deviceId}, cell ${cellNumber}`);
        
        // Генеруємо унікальний cmd_id
        const cmd_id = `ADMIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await gateway.openCell(deviceId, cellNumber, cmd_id);
      } else {
        console.log('⚠️ Device offline, skipping WebSocket command');
      }
    }

    return {
      success: true,
      message: action === 'cleared' 
        ? `Cell ${cellNumber} cleared and opened` 
        : `Cell ${cellNumber} opened for refill`,
      cellNumber,
      product: cell.product,
      action,
      note: action === 'cleared'
        ? 'Cell is now empty (blue) but product is still assigned'
        : 'Please place the product inside and close the cell',
    };
  }

  // ✅ ВИПРАВЛЕНО: Відмітити комірку як заповнену (кур'єр після закриття)
  // СИНЯ → ЗЕЛЕНА: після фізичного заповнення
  async markCellFilled(ortomatId: string, cellNumber: number, courierId: string) {
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
    });

    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    if (!cell.productId) {
      throw new BadRequestException('Cannot mark cell as filled without assigned product');
    }

    const updatedCell = await this.prisma.cell.update({
      where: { id: cell.id },
      data: {
        isAvailable: false, // ✅ Комірка тепер заповнена (ЗЕЛЕНА)
        lastRefillDate: new Date(),
        courierId,
      },
      include: {
        product: true,
      },
    });

    return {
      success: true,
      message: `Cell ${cellNumber} marked as filled`,
      cell: {
        number: updatedCell.number,
        product: updatedCell.product,
        lastRefillDate: updatedCell.lastRefillDate,
        isAvailable: updatedCell.isAvailable,
      },
    };
  }

  // Старий метод refillCell - залишаємо для зворотної сумісності
  async refillCell(ortomatId: string, cellNumber: number, productId: string, courierId: string) {
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
    });

    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updatedCell = await this.prisma.cell.update({
      where: { id: cell.id },
      data: {
        productId,
        isAvailable: false, // Заповнена
        lastRefillDate: new Date(),
        courierId,
      },
      include: {
        product: true,
      },
    });

    return {
      success: true,
      message: `Cell ${cellNumber} refilled with ${product.name}`,
      cell: {
        number: updatedCell.number,
        product: updatedCell.product,
        lastRefillDate: updatedCell.lastRefillDate,
      },
    };
  }
}