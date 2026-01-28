import { IsString, IsNumber, IsOptional, Min, MaxLength, IsNotEmpty, IsIn } from 'class-validator';

export class CreateOrtomatDto {
  @IsString({ message: 'Назва має бути рядком' })
  @IsNotEmpty({ message: 'Назва обов\'язкова' })
  @MaxLength(255, { message: 'Назва занадто довга' })
  name: string;

  @IsString({ message: 'Адреса має бути рядком' })
  @IsNotEmpty({ message: 'Адреса обов\'язкова' })
  @MaxLength(500, { message: 'Адреса занадто довга' })
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Назва міста занадто довга' })
  city?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Кількість комірок має бути числом' })
  @Min(1, { message: 'Мінімум 1 комірка' })
  totalCells?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'maintenance'], { message: 'Статус має бути: active, inactive або maintenance' })
  status?: string;
}

export class UpdateOrtomatDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string; // ✅ ДОДАНО: Місто

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalCells?: number;

  @IsOptional()
  @IsString()
  status?: string;
}