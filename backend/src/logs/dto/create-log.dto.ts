import { IsDateString, IsEnum, IsNumber, IsString } from 'class-validator';
import { Actions, Reasons } from 'src/utils/actions';

export class CreateLogDto {
  @IsDateString()
  timestamp: string;
  @IsString()
  entityType: string;

  @IsEnum(Actions)
  action: Actions;

  @IsEnum(Reasons)
  reason: Reasons;

  @IsNumber()
  quantity: number;
}
