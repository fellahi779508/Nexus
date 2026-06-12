import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from './entities/batch.entity';
import { StockModule } from 'src/stock/stock.module';
import { StartUpService } from './start-up.service';

@Module({
  controllers: [BatchController],
  providers: [BatchService, StartUpService],
  imports: [TypeOrmModule.forFeature([Batch])],
  exports: [BatchService],
})
export class BatchModule {}
