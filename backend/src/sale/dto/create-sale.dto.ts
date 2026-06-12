import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSaleDto {
  @IsNumber()
  total: number;

  @IsNumber()
  @IsOptional()
  clientId?: number;

  @IsNumber()
  paid: number;

  @IsBoolean()
  remise: boolean;
  @IsBoolean()
  isDetailed: boolean;

  @IsString()
  payment_methode: string;
  @IsNumber()
  remiseAmount: number;
  @IsNumber()
  timbre: number;

  @IsDateString()
  date: string;

  @IsArray()
  soldItems: {
    batchId: number;
    quantity: number;
    unit: string;
    qtePerUnit: number;
    sellingPrice: number;
  }[];
}
