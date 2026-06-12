import { PartialType } from '@nestjs/mapped-types';
import { CreateZakatDto } from './create-zakat.dto';

export class UpdateZakatDto extends PartialType(CreateZakatDto) {}
