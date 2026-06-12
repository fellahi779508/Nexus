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
import { SoldItemService } from './sold-item.service';
import { CreateSoldItemDto } from './dto/create-sold-item.dto';
import { UpdateSoldItemDto } from './dto/update-sold-item.dto';

@Controller('sold-item')
export class SoldItemController {
  constructor(private readonly soldItemService: SoldItemService) {}

  @Post()
  create(@Body() createSoldItemDto: CreateSoldItemDto) {
    return this.soldItemService.create(createSoldItemDto);
  }

  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    return this.soldItemService.findAll(page, limit, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.soldItemService.findOne(+id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateSoldItemDto: UpdateSoldItemDto,
  ) {
    return this.soldItemService.update(+id, updateSoldItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.soldItemService.remove(+id);
  }
}
