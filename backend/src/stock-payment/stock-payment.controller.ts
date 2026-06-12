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
} from '@nestjs/common';
import { StockPaymentService } from './stock-payment.service';
import { CreateStockPaymentDto } from './dto/create-stock-payment.dto';
import { UpdateStockPaymentDto } from './dto/update-stock-payment.dto';

@Controller('stock-payment')
export class StockPaymentController {
  constructor(private readonly stockPaymentService: StockPaymentService) {}

  @Post()
  create(@Body() createStockPaymentDto: CreateStockPaymentDto) {
    return this.stockPaymentService.create(createStockPaymentDto);
  }

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
  ) {
    return this.stockPaymentService.findAll(page, limit, search);
  }
  @Get('print/:id')
  async printPurchase(
    @Param('id') id: string,
    @Query('paper') paperType: string = 'A4',
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.stockPaymentService.printPurchase(
      +id,
      paperType,
    );
    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `inline; filename="purchase_${id}.pdf"`,
    });
  }
  @Get('todays')
  getPurchasesOfTheDay() {
    return this.stockPaymentService.getPurchasesOfTheDay();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockPaymentService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateStockPaymentDto: UpdateStockPaymentDto,
  ) {
    return this.stockPaymentService.update(+id, updateStockPaymentDto);
  }

  @Delete('clear')
  clear() {
    return this.stockPaymentService.clearAll();
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockPaymentService.remove(+id);
  }
}
