import { IsDateString, IsNumber, IsObject, IsOptional } from 'class-validator';

export class CreateStockDto {
  @IsNumber()
  quantity: number;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;

  @IsNumber()
  @IsOptional()
  batchId?: number;
}
