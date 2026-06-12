import { Module } from '@nestjs/common';
import { SoldItemService } from './sold-item.service';
import { SoldItemController } from './sold-item.controller';
import { SoldItem } from './entities/sold-item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [SoldItemController],
  providers: [SoldItemService],
  imports: [TypeOrmModule.forFeature([SoldItem])],
})
export class SoldItemModule {}
