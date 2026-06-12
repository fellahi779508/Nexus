import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateStockPaymentDto {
  @IsNumber()
  total: number;

  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @IsNumber()
  paid: number;

  @IsBoolean()
  remise: boolean;
  @IsBoolean()
  isDetailed: boolean;

  @IsNumber()
  remiseAmount: number;

  @IsDateString()
  date: string;
  @IsString()
  payment_method: string;

  @IsNumber()
  timbre: number;

  @IsArray()
  purchasedItems: {
    batchId: number;
    quantity: number;
    unit: string;
    qtePerUnit: number;
    sellingPrice: number;
  }[];
}
