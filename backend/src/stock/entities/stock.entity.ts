import { Batch } from 'src/batch/entities/batch.entity';
import { Log } from 'src/logs/entities/log.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  quantity: number;

  @Column()
  createdAt: string;

  @Column()
  updatedAt: string;

  @OneToOne(() => Batch, (batch) => batch.stock, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @OneToMany(() => Log, (log) => log.stock)
  logs: Log[];
  @BeforeInsert()
  @BeforeUpdate()
  updateStock() {
    if (!this.quantity) {
      this.quantity = 0;
    }
    if (this.quantity <= 0) {
      this.quantity = 0;
    }
    return;
  }
  @BeforeUpdate()
  updateStockUpdatedAt() {
    this.updatedAt = new Date().toISOString();
    return;
  }
}
