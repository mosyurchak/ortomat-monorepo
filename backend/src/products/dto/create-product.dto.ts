// backend/src/products/dto/create-product.dto.ts
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsArray, 
  IsIn,
  MinLength,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'Назва товару обов\'язкова' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Артикул обов\'язковий' })
  sku: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['S', 'M', 'L', 'Uni'], { message: 'Розмір має бути: S, M, L або Uni' })
  size: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Ціна не може бути від\'ємною' })
  price: number;

  @IsString()
  @IsOptional()
  mainImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  // Старі поля для сумісності
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsOptional()
  attributes?: any;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['S', 'M', 'L', 'Uni'])
  @IsOptional()
  size?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  mainImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsOptional()
  attributes?: any;
}