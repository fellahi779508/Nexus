import { Log } from 'src/logs/entities/log.entity';
import { Package } from 'src/package/entities/package.entity';
import { ProductVariant } from 'src/product_variant/entities/product_variant.entity';
import { PurchasedItem } from 'src/purchased-item/entities/purchased-item.entity';
import { SoldItem } from 'src/sold-item/entities/sold-item.entity';
import { StockPayment } from 'src/stock-payment/entities/stock-payment.entity';
import { Stock } from 'src/stock/entities/stock.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity()
export class Batch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  createdAt: string;

  @Column()
  updatedAt: string;

  @Column({ nullable: true })
  fabricationDate: string;

  @Column({ nullable: true })
  expirationDate: string;

  @Column({ nullable: true })
  alertPeriodPerDay: number;

  @Column({ nullable: true })
  alertPeriodPerStock: number;

  @Column({ nullable: true })
  nLot: string;

  @Column({ default: true })
  primary: boolean;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  stockQTYStatus: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.batches, {
    onDelete: 'CASCADE',
  })
  variant: ProductVariant;

  @OneToOne(() => Stock, (stock) => stock.batch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_id' })
  stock: Stock;

  @ManyToOne(() => Supplier, (supplier) => supplier.batches, {
    onDelete: 'SET NULL',
  })
  supplier: Supplier;

  @OneToMany(() => Log, (log) => log.batch, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  logs: Log[];

  @OneToMany(() => SoldItem, (soldItem) => soldItem.batch, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  soldItems: SoldItem[];
  @OneToMany(() => PurchasedItem, (purchasedItem) => purchasedItem.batch, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  purchasedItems: PurchasedItem[];

  @OneToOne(() => Package, (pack) => pack.batch, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  pack: Package;

  @BeforeInsert()
  @BeforeUpdate()
  verifyStockQTYStatus() {
    if (!this.stock) {
      this.stockQTYStatus = 'ok';
      return;
    }

    const currentStockQTY = this.stock.quantity;

    if (currentStockQTY <= this.alertPeriodPerStock && currentStockQTY > 0) {
      this.stockQTYStatus = 'low';

      return;
    }
    if (currentStockQTY === 0) {
      this.stockQTYStatus = 'empty';
      return;
    }
    this.stockQTYStatus = 'ok';
    this.updatedAt = new Date().toISOString();
  }
  @BeforeInsert()
  @BeforeUpdate()
  verifyBatchStatus() {
    const now = new Date();
    const expiration = this.expirationDate
      ? new Date(this.expirationDate)
      : null;

    if (!expiration) {
      this.status = 'ok';
      return;
    }

    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays < 0) {
      this.status = 'expired';
    } else if (diffDays <= (this.alertPeriodPerDay ?? 7)) {
      this.status = 'expiring';
    } else {
      this.status = 'ok';
    }
    this.updatedAt = new Date().toISOString();
  }
}
