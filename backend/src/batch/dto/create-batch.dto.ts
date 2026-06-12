import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsOptional()
  nLot?: string;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  fabricationDate?: string;
  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  expirationDate?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  variantId: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === 0 ? undefined : value))
  alertPeriodPerDay?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === 0 ? undefined : value))
  alertPeriodPerStock?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === 0 ? undefined : value))
  supplierId?: number;

  @IsBoolean()
  @Transform(({ value }) => (value == '' ? false : value))
  primary: boolean;
}
