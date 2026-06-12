import { Log } from 'src/logs/entities/log.entity';
import { Sale } from 'src/sale/entities/sale.entity';
import { StockPayment } from 'src/stock-payment/entities/stock-payment.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Credit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;
  @Column()
  date: string;

  @OneToMany(() => Log, (log) => log.credit, {
    cascade: true,
    nullable: true,
  })
  logs: Log[];

  @OneToOne(() => Sale, (sale) => sale.credit, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @OneToOne(() => StockPayment, (stockPayment) => stockPayment.credit, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_id' })
  stockPayment: StockPayment;
  @BeforeInsert()
  setDate() {
    this.date = new Date().toISOString();
  }
}
