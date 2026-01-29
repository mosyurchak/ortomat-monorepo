// backend/src/products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsIn,
  MinLength,
  Min,
  IsUrl,
  MaxLength,
  ValidateIf,
  IsInt
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'Назва товару обов\'язкова' })
  @MaxLength(255, { message: 'Назва занадто довга' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Артикул обов\'язковий' })
  @MaxLength(100, { message: 'Артикул занадто довгий' })
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(50000, { message: 'Опис занадто довгий' })
  description?: string;

  @IsString()
  @IsIn(['S', 'M', 'L', 'Uni'], { message: 'Розмір має бути: S, M, L або Uni' })
  size: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0, { message: 'Ціна не може бути від\'ємною' })
  price: number;

  @IsInt({ message: 'Кількість реферальних балів має бути цілим числом' })
  @Type(() => Number)
  @Min(0, { message: 'Кількість балів не може бути від\'ємною' })
  @IsOptional()
  referralPoints?: number;

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

  // ✅ ІСНУЮЧІ поля характеристик
  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  // ✅ НОВІ поля характеристик
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.sizeChartUrl && o.sizeChartUrl.trim() !== '')
  @IsUrl({}, { message: 'sizeChartUrl має бути валідним URL' })
  @MaxLength(2000, { message: 'URL занадто довгий' })
  sizeChartUrl?: string;

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

  @IsInt({ message: 'Кількість реферальних балів має бути цілим числом' })
  @Type(() => Number)
  @Min(0, { message: 'Кількість балів не може бути від\'ємною' })
  @IsOptional()
  referralPoints?: number;

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

  // ✅ НОВІ поля
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.sizeChartUrl && o.sizeChartUrl.trim() !== '')
  @IsUrl({}, { message: 'sizeChartUrl має бути валідним URL' })
  @MaxLength(2000, { message: 'URL занадто довгий' })
  sizeChartUrl?: string;

  @IsString()
  @IsOptional()
  termsAndConditions?: string;

  @IsOptional()
  attributes?: any;
}
