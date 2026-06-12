import { Batch } from 'src/batch/entities/batch.entity';
import { StockPayment } from 'src/stock-payment/entities/stock-payment.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PurchasedItem {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  quantity: number;
  @Column({ default: 'piece' })
  unit: string;
  @Column({ default: null })
  qtePerUnit: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;
  @ManyToOne(() => Batch, (batch) => batch.soldItems, { onDelete: 'CASCADE' })
  batch: Batch;

  @ManyToOne(
    () => StockPayment,
    (stockPayment) => stockPayment.purchasedItems,
    {
      onDelete: 'CASCADE',
    },
  )
  stockPayment: StockPayment;
}
