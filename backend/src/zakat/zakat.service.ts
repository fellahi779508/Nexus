import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, ILike, Not } from 'typeorm';

import { Zakat } from './entities/zakat.entity';
import { Stock } from '../stock/entities/stock.entity';
import { CreateZakatDto, UpdateZakatDto } from './dto/create-zakat.dto';
import { Sale } from 'src/sale/entities/sale.entity';
import { Client } from 'src/client/entities/client.entity';

/**
 * One Hijri year ≈ 354 days, 8 hours, 48 minutes in milliseconds.
 * Most scholars accept 354 days; we use the precise value here.
 */
const HIJRI_YEAR_MS =
  354 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 48 * 60 * 1000;

export interface ZakatVerifyResult {
  id: number;
  label: string | null;
  inventoryValue: number;
  nisab: number;
  rate: number;
  reachedNisab: boolean;
  oneYearPassed: boolean;
  zakatDue: boolean;
  zakatAmount: number;
  startDate: string;
  dueDate: string | null;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
}

@Injectable()
export class ZakatService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ZakatService.name);

  constructor(
    @InjectRepository(Zakat)
    private readonly zakatRepo: Repository<Zakat>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Bootstrap ────────────────────────────────────────────────────────────

  /**
   * Runs automatically when the NestJS application starts.
   * Silently re-evaluates any existing Zakat config.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const config = await this.zakatRepo.findOne({
        where: {},
        order: { id: 'ASC' },
      });
      if (!config) {
        this.logger.log(
          'No Zakat configuration found — skipping bootstrap verify.',
        );
        return;
      }
      this.logger.log('Running Zakat bootstrap verification…');
      const result = await this._runVerify(config);
      this.logger.log(
        `Bootstrap verify complete — zakatDue: ${result.zakatDue}, ` +
          `inventory: ${result.inventoryValue.toFixed(2)} DZD, ` +
          `nisab: ${result.nisab.toFixed(2)} DZD.`,
      );
    } catch (err) {
      this.logger.error('Zakat bootstrap verify failed', err);
    }
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  /**
   * Returns the current total value of all stock items in inventory.
   * value = SUM(quantity × sellPrice) for items with quantity > 0.
   */
  async getInventoryValue(type?: string): Promise<number> {
    const stockRepo = this.dataSource.getRepository(Stock);
    const clientRepo = this.dataSource.getRepository(Client);
    const stocks = await stockRepo.find({
      where: { quantity: MoreThan(0), batch: { status: Not('expired') } },
      relations: ['batch', 'batch.variant'],
    });
    let result = 0;
    if (type === 'stockPrice') {
      for (const stock of stocks) {
        result += stock.quantity * stock.batch.variant.sellingPriceTTC;
      }
      return result;
    } else if (type === 'stockPurchase') {
      for (const stock of stocks) {
        result += stock.quantity * stock.batch.variant.purchasePrice;
      }
      return result;
    }
    if (type === 'zakat') {
      for (const stock of stocks) {
        result += stock.quantity * stock.batch.variant.sellingPriceTTC;
      }
      const clients = await clientRepo.find({
        where: { creditTTC: MoreThan(0) },
      });
      for (const client of clients) {
        result += client.creditTTC;
      }
      return result;
    }
    return result;
  }

  // ─── Core verify logic ────────────────────────────────────────────────────

  /**
   * Internal verify — mutates and saves the entity, then returns a rich result.
   */
  private async _runVerify(zakat: Zakat): Promise<ZakatVerifyResult> {
    const inventoryValue = await this.getInventoryValue('zakat');
    const nisab = Number(zakat.nisab);
    const rate = Number(zakat.rate);

    const startDate = new Date(zakat.startDate);
    const now = Date.now();
    const elapsed = now - startDate.getTime();

    const oneYearPassed = elapsed >= HIJRI_YEAR_MS;
    const reachedNisab = inventoryValue >= nisab;
    const zakatDue = oneYearPassed && reachedNisab;

    const daysElapsed = Math.floor(elapsed / (24 * 60 * 60 * 1000));
    const totalDays = Math.ceil(HIJRI_YEAR_MS / (24 * 60 * 60 * 1000)); // 355
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const progressPercent = Math.min(
      100,
      Math.round((daysElapsed / totalDays) * 100),
    );

    // Update persisted fields
    zakat.inventoryValue = inventoryValue;

    if (zakatDue) {
      zakat.isSatisfied = true;
      zakat.zakatAmount = (inventoryValue * rate) / 100;
      if (!zakat.dueDate) {
        // Record the first time conditions were met
        zakat.dueDate = new Date().toISOString();
      }
    } else {
      // Only reset if we haven't already satisfied it
      // (once isSatisfied is true, we keep the record)
      if (!zakat.isSatisfied) {
        zakat.zakatAmount = 0;
        zakat.dueDate = null;
      }
    }

    await this.zakatRepo.save(zakat);

    return {
      id: zakat.id,
      label: zakat.label ?? null,
      inventoryValue,
      nisab,
      rate,
      reachedNisab,
      oneYearPassed,
      zakatDue,
      zakatAmount: Number(zakat.zakatAmount),
      startDate: zakat.startDate,
      dueDate: zakat.dueDate ?? null,
      daysElapsed,
      daysRemaining,
      progressPercent,
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Creates the initial Zakat configuration.
   * Only one configuration is allowed at a time.
   */
  async create(dto: CreateZakatDto): Promise<Zakat> {
    const existing = await this.zakatRepo.count();
    if (existing > 0) {
      throw new BadRequestException(
        'A Zakat configuration already exists. Use PATCH to update it.',
      );
    }

    if (!dto.nisab || dto.nisab <= 0) {
      throw new BadRequestException('Nisab must be a positive number.');
    }

    if (!dto.startDate) {
      throw new BadRequestException('startDate is required.');
    }

    const startDate = new Date(dto.startDate);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException(
        'startDate must be a valid ISO 8601 date string.',
      );
    }

    const zakat = this.zakatRepo.create({
      nisab: dto.nisab,
      rate: dto.rate ?? 2.5,
      startDate: startDate.toISOString(),
      label: dto.label ?? null,
      isSatisfied: false,
      zakatAmount: 0,
      inventoryValue: 0,
      dueDate: null,
    });

    return this.zakatRepo.save(zakat);
  }

  /**
   * Manually triggers a full Zakat verification.
   * Also called automatically on bootstrap.
   */
  async verifyZakat(): Promise<ZakatVerifyResult> {
    const zakat = await this.zakatRepo.findOne({
      where: {},
      order: { id: 'ASC' },
    });
    if (!zakat) {
      throw new NotFoundException(
        'No Zakat configuration found. Create one first via POST /zakat.',
      );
    }
    return this._runVerify(zakat);
  }

  /**
   * Returns a full summary for the UI — always re-evaluates before returning.
   */
  async getSummary(): Promise<ZakatVerifyResult & { config: Zakat | null }> {
    const zakat = await this.zakatRepo.findOne({
      where: {},
      order: { id: 'ASC' },
    });
    if (!zakat) {
      throw new NotFoundException('No Zakat configuration found.');
    }

    const result = await this._runVerify(zakat);

    return {
      ...result,
      config: await this.zakatRepo.findOne({ where: { id: zakat.id } }),
    };
  }

  /**
   * Updates the Zakat configuration (e.g. new nisab for the year).
   * If nisab or startDate changes, the satisfied state is reset so
   * the new cycle can be evaluated fresh.
   */
  async update(id: number, dto: any): Promise<Zakat> {
    const zakat = await this.zakatRepo.findOne({ where: { id } });
    if (!zakat) throw new NotFoundException(`Zakat #${id} not found.`);

    const nisabChanged =
      dto.nisab !== undefined && Number(dto.nisab) !== Number(zakat.nisab);
    const startChanged =
      dto.startDate !== undefined &&
      new Date(dto.startDate).toISOString() !==
        new Date(zakat.startDate).toISOString();

    if (dto.nisab !== undefined) {
      if (dto.nisab <= 0)
        throw new BadRequestException('Nisab must be a positive number.');
      zakat.nisab = dto.nisab;
    }
    if (dto.startDate !== undefined) {
      const d = new Date(dto.startDate);
      if (isNaN(d.getTime())) {
        throw new BadRequestException(
          'startDate must be a valid ISO 8601 date string.',
        );
      }
      zakat.startDate = d.toISOString();
    }
    if (dto.label !== undefined) zakat.label = dto.label;
    if (dto.rate !== undefined) zakat.rate = dto.rate;

    // Reset cycle if key fields changed
    if (nisabChanged || startChanged) {
      zakat.isSatisfied = false;
      zakat.zakatAmount = 0;
      zakat.dueDate = null;
      zakat.inventoryValue = 0;
    }

    return this.zakatRepo.save(zakat);
  }

  async findAll(): Promise<Zakat[]> {
    return this.zakatRepo.find({ where: {}, order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Zakat> {
    const zakat = await this.zakatRepo.findOne({ where: { id } });
    if (!zakat) throw new NotFoundException(`Zakat #${id} not found.`);
    return zakat;
  }

  async remove(id: number): Promise<{ message: string }> {
    const zakat = await this.findOne(id);
    await this.zakatRepo.remove(zakat);
    return { message: `Zakat #${id} deleted.` };
  }
}
