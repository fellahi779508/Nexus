import { Batch } from 'src/batch/entities/batch.entity';
import { Client } from 'src/client/entities/client.entity';
import { Credit } from 'src/credit/entities/credit.entity';
import { Sale } from 'src/sale/entities/sale.entity';
import { StockPayment } from 'src/stock-payment/entities/stock-payment.entity';
import { Stock } from 'src/stock/entities/stock.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Log {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  timestamp: string;

  @Column()
  entityType: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  quantity: number;

  @ManyToOne(() => Client, (client) => client.logs, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  client: Client;

  @ManyToOne(() => Sale, (sale) => sale.logs, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  sale: Sale;

  @ManyToOne(() => Stock, (stock) => stock.logs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  stock: Stock;

  @ManyToOne(() => Credit, (credit) => credit.logs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  credit: Credit;
  @ManyToOne(() => StockPayment, (stockPayment) => stockPayment.logs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  stockPayment: StockPayment;

  @ManyToOne(() => Batch, (batch) => batch.logs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  batch: Batch;

  @ManyToOne(() => Supplier, (supplier) => supplier.logs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  supplier: Supplier;
}
