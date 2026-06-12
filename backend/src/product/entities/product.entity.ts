import { Category } from 'src/category/entities/category.entity';
import { ProductVariant } from 'src/product_variant/entities/product_variant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  createdAt: string;

  @Column()
  updatedAt: string;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  category: Category;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  variants: ProductVariant[];
}
