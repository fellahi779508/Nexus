import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Reasons } from 'src/utils/actions';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('stockStatus') stockStatus?: string,
  ) {
    return this.stockService.findAll(page, limit, search, status, stockStatus);
  }
  @Get('barcode/:barcode')
  getStockByBarcode(@Param('barcode') barcode: string) {
    return this.stockService.getStockByBarcode(barcode);
  }
  @Get('sellable')
  getSellableStock(@Query('page') page: number, @Query('limit') limit: number, @Query('search') search?: string) {
    return this.stockService.getSellableStock(page, limit, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(+id);
  }
  @Put('add/:id')
  addToStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.stockService.addToStock(+id, dto);
  }
  @Put('remove/:id')
  removeFromStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.stockService.removeFromStock(+id, dto);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.update(+id, updateStockDto);
  }

  @Delete('clear')
  cleareAll() {
    return this.stockService.cleareAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockService.remove(+id);
  }
}
