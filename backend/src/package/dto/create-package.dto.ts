import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  type: string;
  @IsNumber()
  quantity: number;
  @IsNumber()
  @IsOptional()
  discount?: number;
  @IsNumber()
  @IsOptional()
  discountRate?: number;

  @IsNumber()
  batchId: number;
}
