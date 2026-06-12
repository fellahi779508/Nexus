import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zakat')
export class Zakat {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Nisab threshold for this Zakat year (in DZD).
   * The user sets this manually each year based on gold/silver price.
   */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  nisab: number;

  /**
   * Zakat rate — fixed at 2.5% (1/40) in Islamic law.
   * Stored to allow future override if needed.
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 2.5,
  })
  rate: number;

  /**
   * The date the user started tracking this Zakat cycle.
   * Zakat becomes due one Hijri year (≈ 354 days) after this date,
   * provided the inventory continuously met or exceeded the nisab.
   * Stored as ISO 8601 string.
   */
  @Column({ type: 'varchar' })
  startDate: string;

  /**
   * Populated when Zakat becomes due (one year passed + nisab met).
   */
  @Column({ type: 'varchar', nullable: true })
  dueDate: string | null;

  /**
   * Latest inventory value at the time of the last verify run.
   */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  inventoryValue: number;

  /**
   * True when both conditions are met: one year elapsed AND inventory >= nisab.
   */
  @Column({ default: false })
  isSatisfied: boolean;

  /**
   * Zakat amount owed = inventoryValue × (rate / 100).
   * 0 when not yet satisfied.
   */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  zakatAmount: number;

  /**
   * Label for the year, e.g. "2025" or "1446 AH".
   */
  @Column({ type: 'varchar', nullable: true })
  label: string | null;
}
