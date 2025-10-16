import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateOrtomatDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

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