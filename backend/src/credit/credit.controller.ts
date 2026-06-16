import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';

@Controller('credit')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Post()
  create(@Body() createCreditDto: CreateCreditDto) {
    return this.creditService.create(createCreditDto);
  }

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('date') date?: string,
  ) {
    return this.creditService.findAll(page, limit, search, type, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.creditService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCreditDto: UpdateCreditDto) {
    return this.creditService.update(+id, updateCreditDto);
  }

  @Delete('client/:id')
  remove(@Param('id') id: string) {
    return this.creditService.removeCreditsOfClientById(+id);
  }
  @Delete('supplier/:id')
  remove2(@Param('id') id: string) {
    return this.creditService.removeCreditsOfSupplierById(+id);
  }
}
