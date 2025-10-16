import { IsString, IsUUID, IsOptional } from 'class-validator';

export class UpdateCellProductDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  productId?: string | null; // null = видалити товар з комірки
}

export class RefillCellDto {
  @IsString()
  @IsUUID()
  productId: string;

  @IsString()
  @IsUUID()
  courierId: string;
}

export class MarkCellFilledDto {
  @IsString()
  @IsUUID()
  courierId: string;
}