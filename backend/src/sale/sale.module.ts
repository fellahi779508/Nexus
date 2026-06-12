import { Module } from '@nestjs/common';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { ClientModule } from 'src/client/client.module';
import { StockModule } from 'src/stock/stock.module';
import { BatchModule } from 'src/batch/batch.module';

@Module({
  controllers: [SaleController],
  providers: [SaleService],
  imports: [
    TypeOrmModule.forFeature([Sale]),
    ClientModule,
    StockModule,
    BatchModule,
  ],
})
export class SaleModule {}
