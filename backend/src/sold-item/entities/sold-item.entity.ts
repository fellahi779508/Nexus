import { Batch } from 'src/batch/entities/batch.entity';
import { Sale } from 'src/sale/entities/sale.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SoldItem {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  quantity: number;
  @Column({ default: 'piece' })
  unit: string;
  @Column({ default: null })
  qtePerUnit: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice: number;
  @ManyToOne(() => Batch, (batch) => batch.soldItems, { onDelete: 'CASCADE' })
  batch: Batch;

  @ManyToOne(() => Sale, (sale) => sale.soldItems, { onDelete: 'CASCADE' })
  sale: Sale;
}
