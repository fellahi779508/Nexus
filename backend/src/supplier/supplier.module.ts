import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { Supplier } from './entities/supplier.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditModule } from 'src/credit/credit.module';

@Module({
  controllers: [SupplierController],
  providers: [SupplierService],
  imports: [TypeOrmModule.forFeature([Supplier]), CreditModule],
})
export class SupplierModule {}
