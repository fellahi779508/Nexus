import { PartialType } from '@nestjs/mapped-types';
import { CreateStockDto } from './create-stock.dto';
import { IsEnum, IsNumber, IsString } from 'class-validator';
import { Reasons } from 'src/utils/actions';
import { Transform } from 'class-transformer';

export class UpdateStockDto extends PartialType(CreateStockDto) {
  @IsString()
  reason: string;

  @IsNumber()
  @Transform(({ value }) =>
    parseInt(value) < 0 ? parseInt(value) * -1 : parseInt(value),
  )
  quantity: number;
}
