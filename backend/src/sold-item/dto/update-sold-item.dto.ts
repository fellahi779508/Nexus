import { PartialType } from '@nestjs/mapped-types';
import { CreateSoldItemDto } from './create-sold-item.dto';

export class UpdateSoldItemDto extends PartialType(CreateSoldItemDto) {}
