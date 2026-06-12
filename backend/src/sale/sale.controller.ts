import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Controller('sale')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.saleService.create(createSaleDto);
  }

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.saleService.findAll(page, limit, search);
  }
  @Get('print/:id')
  async printSale(
    @Param('id') id: string,
    @Query('paper') paperType: string = 'A4',
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.saleService.printSale(+id, paperType);
    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `inline; filename="sale_${id}.pdf"`,
    });
  }
  @Get('todays')
  getTodaysSales() {
    return this.saleService.getTodaysSales();
  }
  @Get('todays/detailed')
  getTodaysDetailedSales() {
    return this.saleService.getTodaysDetailedSales();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.saleService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.saleService.update(+id, updateSaleDto);
  }

  @Delete('clear')
  cleareAll() {
    return this.saleService.cleareAll();
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.saleService.remove(+id);
  }
}
