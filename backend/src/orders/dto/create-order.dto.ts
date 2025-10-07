import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  ortomatId: string;

  @IsUUID()
  productId: string;

  @IsNumber()
  cellNumber: number;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}