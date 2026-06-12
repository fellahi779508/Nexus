import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchasedItemDto } from './create-purchased-item.dto';

export class UpdatePurchasedItemDto extends PartialType(CreatePurchasedItemDto) {}
