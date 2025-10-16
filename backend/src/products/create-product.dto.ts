import { IsString, IsNumber, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsNumber()
  price: number;

  // ✅ ДОДАНО: Нові поля
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]; // Масив URL до 6 зображень

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsAndConditions?: string;

  // Старе поле для зворотної сумісності
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  attributes?: any;
}