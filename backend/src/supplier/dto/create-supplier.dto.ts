import {
  IsDateString,
  IsEmail,
  IsNumberString,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;
  @IsString()
  @IsNumberString()
  @IsOptional()
  phone?: string;
  @IsString()
  @IsOptional()
  address?: string;
  @IsDateString()
  createdAt: string;
  @IsDateString()
  updatedAt: string;
}
