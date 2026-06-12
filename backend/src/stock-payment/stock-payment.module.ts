import { Module } from '@nestjs/common';
import { StockPaymentService } from './stock-payment.service';
import { StockPaymentController } from './stock-payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockPayment } from './entities/stock-payment.entity';

@Module({
  controllers: [StockPaymentController],
  providers: [StockPaymentService],
  imports: [TypeOrmModule.forFeature([StockPayment])],
})
export class StockPaymentModule {}
