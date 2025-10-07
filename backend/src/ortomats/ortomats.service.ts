import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrtomatsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OrtomatCreateInput) {
    const ortomat = await this.prisma.ortomat.create({
      data,
    });

    const cells = Array.from({ length: 37 }, (_, i) => ({
      number: i + 1,
      ortomatId: ortomat.id,
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

  async updateCellProduct(ortomatId: string, cellNumber: number, productId: string | null) {
    return this.prisma.cell.updateMany({
      where: {
        ortomatId,
        number: cellNumber,
      },
      data: {
        productId,
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
      product: cell.product ? {
        id: cell.product.id,
        name: cell.product.name,
        size: cell.product.size,
        price: cell.product.price,
      } : null,
    }));
  }

  async refillCell(ortomatId: string, cellNumber: number, productId: string, courierId: string) {
    // Перевіряємо чи існує комірка
    const cell = await this.prisma.cell.findFirst({
      where: {
        ortomatId,
        number: cellNumber,
      },
    });

    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    // Перевіряємо чи існує товар
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Оновлюємо комірку
    const updatedCell = await this.prisma.cell.update({
      where: { id: cell.id },
      data: {
        productId,
        isAvailable: true,
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