import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsPositive,
  isString,
  IsString,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  nLot?: string;

  @IsNumberString()
  barcode: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  size?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  color?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  weight?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  height?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  flavor?: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;

  @IsNumber()
  productId: number;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  fabricationDate?: string;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  expirationDate?: string;

  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === 0 ? null : value))
  alertPeriodPerDay?: number;
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === 0 ? null : value))
  alertPeriodPerStock?: number;

  @IsNumber()
  @IsPositive()
  purchasePrice: number;

  @IsNumber()
  @IsPositive()
  sellingPriceHT: number;

  @IsNumber()
  vatRate: number;

  @IsNumber()
  sellingPriceTTC: number;

  @IsNumber()
  profit: number;

  @IsNumber()
  profitRate: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === 0 ? null : value))
  promotionPrice?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Transform(({ value }) => (value === 0 ? null : value))
  promotionRate?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  PPA?: string;
}
