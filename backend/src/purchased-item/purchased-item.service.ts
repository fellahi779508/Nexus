import { Injectable } from '@nestjs/common';
import { CreatePurchasedItemDto } from './dto/create-purchased-item.dto';
import { UpdatePurchasedItemDto } from './dto/update-purchased-item.dto';

@Injectable()
export class PurchasedItemService {
  create(createPurchasedItemDto: CreatePurchasedItemDto) {
    return 'This action adds a new purchasedItem';
  }

  findAll() {
    return `This action returns all purchasedItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} purchasedItem`;
  }

  update(id: number, updatePurchasedItemDto: UpdatePurchasedItemDto) {
    return `This action updates a #${id} purchasedItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} purchasedItem`;
  }
}
