// backend/src/products/products.service.ts
import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException(
        `Товар з артикулом "${createProductDto.sku}" вже існує`
      );
    }

    const images = createProductDto.images?.filter(img => img && img.trim() !== '') || [];
    if (images.length > 4) {
      throw new BadRequestException('Максимум 4 додаткових зображення');
    }

    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        sku: createProductDto.sku,
        description: createProductDto.description,
        size: createProductDto.size,
        price: createProductDto.price,
        mainImage: createProductDto.mainImage,
        images: images,
        videoUrl: createProductDto.videoUrl,
        imageUrl: createProductDto.imageUrl || createProductDto.mainImage,
        color: createProductDto.color,
        material: createProductDto.material,
        manufacturer: createProductDto.manufacturer,
        termsAndConditions: createProductDto.termsAndConditions,
        attributes: createProductDto.attributes,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        cells: {
          include: {
            ortomat: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Товар з ID "${id}" не знайдено`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Товар з ID "${id}" не знайдено`);
    }

    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const duplicateProduct = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });

      if (duplicateProduct) {
        throw new ConflictException(
          `Товар з артикулом "${updateProductDto.sku}" вже існує`
        );
      }
    }

    if (updateProductDto.images) {
      const images = updateProductDto.images.filter(img => img && img.trim() !== '');
      if (images.length > 4) {
        throw new BadRequestException('Максимум 4 додаткових зображення');
      }
      updateProductDto.images = images;
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        ...(updateProductDto.mainImage && { 
          imageUrl: updateProductDto.mainImage 
        }),
      },
      include: {
        cells: {
          include: {
            ortomat: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        cells: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Товар з ID "${id}" не знайдено`);
    }

    const cellsWithProduct = product.cells.filter(cell => cell.productId === id);

    if (cellsWithProduct.length > 0) {
      throw new ConflictException(
        `Неможливо видалити товар. Він використовується в ${cellsWithProduct.length} комірках. ` +
        `Спочатку видаліть товар з комірок.`
      );
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async search(query: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}