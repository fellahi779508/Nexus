import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Put,
  Query,
  Post,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Controller('batch')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.batchService.findAll(page, limit, search);
  }

  @Get('product/:id')
  getBatchByProductId(@Param('id') id: string) {
    return this.batchService.getBatchByProductId(+id);
  }
  @Get('variant/:id')
  getAllBatchesOfVariant(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
  ) {
    return this.batchService.getAllBatchesOfVariant(+id, page, limit, search);
  }

  @Get('alert')
  alert(@Query('page') page: number, @Query('limit') limit: number) {
    return this.batchService.getExpiringBatches(page, limit);
  }
  @Get('expired')
  getExpired(@Query('page') page: number, @Query('limit') limit: number) {
    return this.batchService.getExpiredBatches(page, limit);
  }
  @Get('normal')
  getNormal(@Query('page') page: number, @Query('limit') limit: number) {
    return this.batchService.getNormalBatches(page, limit);
  }
  @Get('empty')
  getEmpty(@Query('page') page: number, @Query('limit') limit: number) {
    return this.batchService.getEmptyBatches(page, limit);
  }
  @Get('low')
  getLow(@Query('page') page: number, @Query('limit') limit: number) {
    return this.batchService.getLowStockBatches(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchService.findOne(+id);
  }
  @Post()
  create(@Body() createBatchDto: CreateBatchDto) {
    return this.batchService.create(createBatchDto);
  }

  @Put('verify-expiry')
  verifyExpiry() {
    return this.batchService.verifyExpiry();
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() updateBatchDto: UpdateBatchDto) {
    return this.batchService.update(+id, updateBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.batchService.remove(+id);
  }
}
