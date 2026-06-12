import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { ClientModule } from './client/client.module';
import { SaleModule } from './sale/sale.module';
import { StockModule } from './stock/stock.module';
import { ProductVariantModule } from './product_variant/product_variant.module';
import { BatchModule } from './batch/batch.module';
import { SupplierModule } from './supplier/supplier.module';
import { LogsModule } from './logs/logs.module';
import { CreditModule } from './credit/credit.module';
import { SoldItemModule } from './sold-item/sold-item.module';
import { StockPaymentModule } from './stock-payment/stock-payment.module';
import { getDatabasePath } from './dataPath';
import { BackupModule } from './backup/backup.module';
import { PackageModule } from './package/package.module';
import { OwnerModule } from './owner/owner.module';
import { PurchasedItemModule } from './purchased-item/purchased-item.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ZakatModule } from './zakat/zakat.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: getDatabasePath(),
      synchronize: true,
      autoLoadEntities: true,
    }),
    ProductModule,
    StockModule,
    SaleModule,
    ClientModule,
    CategoryModule,
    ProductVariantModule,
    BatchModule,
    SupplierModule,
    LogsModule,
    CreditModule,
    SoldItemModule,
    StockPaymentModule,
    BackupModule,
    PackageModule,
    OwnerModule,
    PurchasedItemModule,
    ZakatModule,
  ],
})
export class AppModule {}
