import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PurchasedItemService } from './purchased-item.service';
import { CreatePurchasedItemDto } from './dto/create-purchased-item.dto';
import { UpdatePurchasedItemDto } from './dto/update-purchased-item.dto';

@Controller('purchased-item')
export class PurchasedItemController {
  constructor(private readonly purchasedItemService: PurchasedItemService) {}

  @Post()
  create(@Body() createPurchasedItemDto: CreatePurchasedItemDto) {
    return this.purchasedItemService.create(createPurchasedItemDto);
  }

  @Get()
  findAll() {
    return this.purchasedItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasedItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePurchasedItemDto: UpdatePurchasedItemDto) {
    return this.purchasedItemService.update(+id, updatePurchasedItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchasedItemService.remove(+id);
  }
}
