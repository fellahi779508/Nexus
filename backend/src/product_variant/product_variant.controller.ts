import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { ProductVariantService } from './product_variant.service';
import { CreateProductVariantDto } from './dto/create-product_variant.dto';
import { UpdateProductVariantDto } from './dto/update-product_variant.dto';

@Controller('product-variant')
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) {}

  @Post()
  async create(@Body() createProductVariantDto: CreateProductVariantDto) {
    return await this.productVariantService.create(createProductVariantDto);
  }

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.productVariantService.findAll(page, limit, search);
  }
  @Get('barcode')
  createBarcode() {
    return this.productVariantService.generateUniqueBarcode();
  }

  @Get('product/:productId')
  getAllVariantsOfProduct(
    @Param('productId') productId: number,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.productVariantService.getAllVariantsOfProduct(
      productId,
      page,
      limit,
      search,
    );
  }

  @Get('/barcode/:barcode')
  getStockByBarcode(@Param('barcode') barcode: string) {
    return this.productVariantService.findByBarceode(barcode);
  }
  @Get('sallable')
  getSallableVariants(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.productVariantService.getSallableVariants(page, limit, search);
  }
  @Get('sallable/all')
  getAllSallableVariants(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.productVariantService.getAllSallableVariants(
      page,
      limit,
      search,
    );
  }
  @Get('purchasable/all')
  getAllPurchasableVariants(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.productVariantService.getAllPurchasableVariants(
      page,
      limit,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productVariantService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductVariantDto: UpdateProductVariantDto,
  ) {
    return this.productVariantService.update(+id, updateProductVariantDto);
  }

  //dev only
  @Delete('/clear')
  cleareAll() {
    return this.productVariantService.cleareAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productVariantService.remove(+id);
  }
}
