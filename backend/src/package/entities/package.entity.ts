import { Batch } from 'src/batch/entities/batch.entity';
import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  type: string;
  @Column()
  quantity: number;
  @Column()
  total: number;

  //remise
  @Column({ nullable: true })
  discount: number;
  @Column({ nullable: true })
  discountRate: number;
  @OneToOne(() => Batch, (batch) => batch.pack, { nullable: true })
  batch: Batch;
}
