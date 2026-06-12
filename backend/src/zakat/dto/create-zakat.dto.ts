export class CreateZakatDto {
  /** Nisab threshold in DZD */
  nisab: number;

  /** ISO date string: when the user started this Zakat cycle */
  startDate: string;

  /** Optional human label, e.g. "1446 AH" */
  label?: string;

  /** Zakat rate — defaults to 2.5 */
  rate?: number;
}

export class UpdateZakatDto {
  /** Update nisab threshold (user-provided each year) */
  nisab?: number;

  /** Update the start date */
  startDate?: string;

  /** Update label */
  label?: string;

  /** Update rate (rare — kept for flexibility) */
  rate?: number;
}
