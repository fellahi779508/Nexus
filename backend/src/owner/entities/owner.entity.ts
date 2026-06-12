import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Owner {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  password: string;
  @Column({ nullable: true })
  description: string;
  @Column({ nullable: true })
  address: string;
  @Column({ nullable: true })
  phone: string;
  @Column({ nullable: true })
  fax: string;
  @Column({ nullable: true })
  email: string;
  @Column({ nullable: true })
  website: string;
  @Column({ nullable: true })
  capital: string;
  @Column({ nullable: true })
  RC: string;
  @Column({ nullable: true })
  NIS: string;
  @Column({ nullable: true })
  NIF: string;
  @Column({ nullable: true })
  IF: string;
  @Column({ nullable: true })
  NA: string;
  @Column({ nullable: true, type: 'blob' })
  image: Buffer;
}
