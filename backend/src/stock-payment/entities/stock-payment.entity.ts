import { Batch } from 'src/batch/entities/batch.entity';
import { Credit } from 'src/credit/entities/credit.entity';
import { Log } from 'src/logs/entities/log.entity';
import { PurchasedItem } from 'src/purchased-item/entities/purchased-item.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

@Entity()
export class StockPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paid: number;
  @Column({ default: false })
  isDetailed: boolean;

  @Column()
  date: string;

  @Column({ default: false })
  remise: boolean;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remiseAmount: number;

  @Column({ default: 'cash' })
  payment_method: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  timbre: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.stockPayments, {
    onDelete: 'SET NULL',
  })
  supplier: Supplier;
  @OneToMany(
    () => PurchasedItem,
    (purchasedItem) => purchasedItem.stockPayment,
    {
      onDelete: 'CASCADE',
    },
  )
  purchasedItems: PurchasedItem[];

  @OneToOne(() => Credit, (credit) => credit.stockPayment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  credit: Credit;

  @OneToMany(() => Log, (log) => log.stockPayment)
  logs: Log[];
}
