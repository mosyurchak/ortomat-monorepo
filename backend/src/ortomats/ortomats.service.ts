import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OrtomatsGateway } from './ortomats.gateway';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class OrtomatsService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  async create(data: Prisma.OrtomatCreateInput) {
    const ortomat = await this.prisma.ortomat.create({
      data,
    });

    const cells = Array.from({ length: data.totalCells || 37 }, (_, i) => ({
      number: i + 1,
      ortomatId: ortomat.id,
      isAvailable: true,
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
            isAvailable: false,
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
    return { success: true, message: `Cell ${cellNumber} opened` };
  }

  async updateCellProduct(ortomatId: string, cellNumber: number, productId: string | null) {
    let cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
    });

    if (!cell) {
      cell = await this.prisma.cell.create({
        data: {
          number: cellNumber,
          ortomatId,
          productId,
          isAvailable: true,
        },
      });
      
      return this.prisma.cell.findUnique({
        where: { id: cell.id },
        include: { product: true },
      });
    }

    return this.prisma.cell.update({
      where: { id: cell.id },
      data: {
        productId,
        isAvailable: true,
      },
      include: {
        product: true,
      },
    });
  }

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
      isAvailable: cell.isAvailable,
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

    const action = !cell.isAvailable ? 'cleared' : 'opened';
    
    if (!cell.isAvailable) {
      await this.prisma.cell.update({
        where: { id: cell.id },
        data: {
          isAvailable: true,
          lastRefillDate: null,
        },
      });
    }

    // ✅ ВИПРАВЛЕНО: Використовуємо реальний ID ортомату
    const deviceId = ortomatId;
    const ortomatName = cell.ortomat.name;
    
    if (gateway) {
      const isOnline = gateway.isDeviceOnline(deviceId);
      
      if (isOnline) {
        console.log(`🔌 Sending WebSocket command to ${ortomatName} (${deviceId}), cell ${cellNumber}`);
        
        const cmd_id = `ADMIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await gateway.openCell(deviceId, cellNumber, cmd_id);
      } else {
        console.log(`⚠️ Device ${ortomatName} (${deviceId}) offline, skipping WebSocket command`);
      }
    }

    // ✅ ВИПРАВЛЕНО: Логування з повними деталями
    await this.logsService.logCellOpened({
      cellNumber,
      ortomatId,
      userId: courierId,
      reason: action === 'cleared' ? 'Clearing filled cell' : 'Opening for refill',
      metadata: {
        action,
        ortomatName,
        deviceId,
        productId: cell.productId,
        productName: cell.product?.name,
        deviceOnline: gateway?.isDeviceOnline(deviceId),
      },
    });

    return {
      success: true,
      message: action === 'cleared' 
        ? `${ortomatName}, комірка ${cellNumber} очищена та відкрита` 
        : `${ortomatName}, комірка ${cellNumber} відкрита для заповнення`,
      cellNumber,
      product: cell.product,
      action,
      ortomatName,
      note: action === 'cleared'
        ? 'Cell is now empty (blue) but product is still assigned'
        : 'Please place the product inside and close the cell',
    };
  }

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
        isAvailable: false,
        lastRefillDate: new Date(),
        courierId,
      },
      include: {
        product: true,
      },
    });

    // ✅ Логування заповнення комірки
    await this.logsService.logCourierRefill({
      cellNumber,
      ortomatId,
      courierId,
      productId: cell.productId!,
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
        isAvailable: false,
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