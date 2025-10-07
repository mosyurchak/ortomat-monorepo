import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.product.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        cells: {
          include: {
            ortomat: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        cells: {
          include: {
            ortomat: true,
          },
        },
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}