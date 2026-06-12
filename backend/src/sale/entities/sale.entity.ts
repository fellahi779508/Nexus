import { Client } from 'src/client/entities/client.entity';
import { Credit } from 'src/credit/entities/credit.entity';
import { Log } from 'src/logs/entities/log.entity';
import { SoldItem } from 'src/sold-item/entities/sold-item.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Sale {
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
  payment_methode: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  timbre: number;

  @OneToMany(() => Log, (log) => log.sale)
  logs: Log[];

  @OneToOne(() => Credit, (credit) => credit.sale, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  credit: Credit;

  @ManyToOne(() => Client, (client) => client.sales, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  client: Client;

  @OneToMany(() => SoldItem, (soldItem) => soldItem.sale, {
    nullable: true,
  })
  soldItems: SoldItem[];
}
