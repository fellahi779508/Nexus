import { PartialType } from '@nestjs/mapped-types';
import { CreateStockPaymentDto } from './create-stock-payment.dto';

export class UpdateStockPaymentDto extends PartialType(CreateStockPaymentDto) {}
