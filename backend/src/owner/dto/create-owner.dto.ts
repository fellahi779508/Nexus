import {
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateOwnerDto {
  @IsString()
  name: string;
  @IsString()
  password: string;
  @IsString()
  @IsOptional()
  address: string;
  @IsString()
  @IsOptional()
  @IsNumberString()
  phone: string;
  @IsString()
  @IsOptional()
  @IsNumberString()
  fax: string;
  @IsString()
  @IsOptional()
  @IsEmail()
  email: string;
  @IsString()
  @IsOptional()
  @IsUrl()
  website: string;
  @IsString()
  @IsOptional()
  capital: string;
  @IsString()
  @IsOptional()
  RC: string;
  @IsString()
  @IsOptional()
  NIS: string;
  @IsString()
  @IsOptional()
  NIF: string;
  @IsString()
  @IsOptional()
  IF: string;
  @IsString()
  @IsOptional()
  NA: string;
  @IsOptional()
  image: Buffer;
}
