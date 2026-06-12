import { Module } from '@nestjs/common';
import { ProductVariantService } from './product_variant.service';
import { ProductVariantController } from './product_variant.controller';
import { ProductVariant } from './entities/product_variant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from 'src/product/product.module';
import { BatchModule } from 'src/batch/batch.module';

@Module({
  controllers: [ProductVariantController],
  providers: [ProductVariantService],
  imports: [
    TypeOrmModule.forFeature([ProductVariant]),
    ProductModule,
    BatchModule,
  ],
  exports: [ProductVariantService],
})
export class ProductVariantModule {}
