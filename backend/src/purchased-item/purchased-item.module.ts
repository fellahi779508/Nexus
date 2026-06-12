import { Module } from '@nestjs/common';
import { PurchasedItemService } from './purchased-item.service';
import { PurchasedItemController } from './purchased-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasedItem } from './entities/purchased-item.entity';

@Module({
  controllers: [PurchasedItemController],
  providers: [PurchasedItemService],
  imports: [TypeOrmModule.forFeature([PurchasedItem])],
})
export class PurchasedItemModule {}
