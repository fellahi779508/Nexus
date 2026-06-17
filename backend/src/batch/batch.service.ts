import { Injectable, NotFoundException } from '@nestjs/common';

import { UpdateBatchDto } from './dto/update-batch.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  ILike,
  IsNull,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { Batch } from './entities/batch.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { Stock } from 'src/stock/entities/stock.entity';
import { ProductVariant } from 'src/product_variant/entities/product_variant.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Log } from 'src/logs/entities/log.entity';

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(Batch) private batchRepository: Repository<Batch>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createBatchDto: CreateBatchDto) {
    return this.dataSource.transaction(async (manager) => {
      const batchRepo = manager.getRepository(Batch);
      const stockRepo = manager.getRepository(Stock);
      const variantRepo = manager.getRepository(ProductVariant);

      const nowDate = new Date();
      const nowISO = nowDate.toISOString();

      // 🔹 Supplier (optional)
      let supplier: Supplier | null = null;
      if (createBatchDto.supplierId) {
        supplier = await manager.findOne(Supplier, {
          where: { id: createBatchDto.supplierId },
        });
        if (!supplier) {
          throw new NotFoundException('Supplier not found');
        }
      }

      // 🔹 Variant (required)
      const variant = await variantRepo.findOne({
        where: { id: createBatchDto.variantId },
      });
      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
      if (createBatchDto.primary) {
        // Set all other batches for this variant to not primary
        await batchRepo.update(
          { variant: { id: createBatchDto.variantId }, primary: true },
          { primary: false },
        );
      }
      // 🔹 Create batch (without stock first)
      const batch = batchRepo.create({
        ...createBatchDto,
        supplier: supplier ?? undefined,
        variant,
        createdAt: nowISO,
        updatedAt: nowISO,
      });
      const savedBatch = await batchRepo.save(batch);

      // 🔹 Create stock
      const stock = stockRepo.create({
        quantity: createBatchDto.quantity,
        createdAt: nowISO,
        updatedAt: nowISO,
        batch: savedBatch,
      });

      const savedStock = await stockRepo.save(stock);

      // 🔹 Attach stock to batch
      savedBatch.stock = savedStock;

      // =========================================================
      // ✅ Compute EXPIRATION STATUS (was verifyStatus hook)
      // =========================================================
      if (!savedBatch.expirationDate) {
        savedBatch.status = 'ok';
      } else {
        const expiration = new Date(savedBatch.expirationDate);

        if (nowDate > expiration) {
          savedBatch.status = 'expired';
        } else {
          const msPerDay = 1000 * 60 * 60 * 24;
          const daysLeft = Math.floor(
            (expiration.getTime() - nowDate.getTime()) / msPerDay,
          );

          if (daysLeft <= 0) {
            savedBatch.status = 'expired';
          } else if (
            savedBatch.alertPeriodPerDay !== null &&
            savedBatch.alertPeriodPerDay !== undefined &&
            daysLeft <= savedBatch.alertPeriodPerDay
          ) {
            savedBatch.status = 'expiring';
          } else {
            savedBatch.status = 'ok';
          }
        }
      }

      // =========================================================
      // ✅ Compute STOCK STATUS (FIXED)
      // =========================================================
      if (
        savedBatch.alertPeriodPerStock === null ||
        savedBatch.alertPeriodPerStock === undefined
      ) {
        savedBatch.stockQTYStatus = 'ok';
      } else {
        const qty = savedStock.quantity;

        if (qty === 0) {
          savedBatch.stockQTYStatus = 'empty';
        } else if (qty <= savedBatch.alertPeriodPerStock) {
          savedBatch.stockQTYStatus = 'low';
        } else {
          savedBatch.stockQTYStatus = 'ok';
        }
      }

      // 🔹 Final save

      return await batchRepo.save(savedBatch);
    });
  }

  async findAll(page: number, limit: number, search?: string) {
    console.log(search);
    if (search) {
      const [items, total] = await this.batchRepository.findAndCount({
        where: { variant: { name: ILike(`%${search}%`) } },
        take: limit,
        skip: (page - 1) * limit,
        relations: ['stock', 'variant'],
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [items, total] = await this.batchRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['stock', 'variant'],
    });
    return {
      data: items,

      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async verifyExpiry() {
    // Fetch all batches to verify their expiry status
    const batches = await this.batchRepository.find({
      relations: ['stock'],
    });

    for (const batch of batches) {
      if (!batch.expirationDate) {
        batch.status = 'ok';
      } else {
        const now = new Date();
        const expiration = new Date(batch.expirationDate);
        // Define expiring period in days (e.g., less than 7 days to expire)
        const expiringThreshold = batch.alertPeriodPerDay ?? 7;

        // Calculate difference in days between expiration and now
        const diffTime = expiration.getTime() - now.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (diffDays < 0) {
          batch.status = 'expired';
        } else if (diffDays <= expiringThreshold) {
          batch.status = 'expiring';
        } else {
          batch.status = 'ok';
        }
      }
      if (batch.stock.quantity === 0) {
        console.log('here');

        batch.stockQTYStatus = 'empty';
      } else if (batch.stock.quantity < batch.alertPeriodPerStock) {
        batch.stockQTYStatus = 'low';
      } else {
        batch.stockQTYStatus = 'ok';
      }
      await this.batchRepository.save(batch);
    }
    return { message: 'Batch expiry verification completed.' };
  }
  async getExpiredBatches(page: number, limit: number) {
    const [items, total] = await this.batchRepository.findAndCount({
      where: { status: 'expired' },
      relations: ['stock', 'variant'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getExpiringBatches(page: number, limit: number) {
    const [items, total] = await this.batchRepository.findAndCount({
      where: { status: 'expiring' },
      relations: ['stock', 'variant'],
      take: limit,
      skip: (page - 1) * limit,
    });
    console.log(items);

    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async findOne(id: number) {
    const batch = await this.batchRepository.findOne({
      where: { id },
      relations: ['stock', 'supplier'],
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    return batch;
  }

  async update(id: number, updateBatchDto: UpdateBatchDto) {
    return this.dataSource.transaction(async (manager) => {
      const batchRepo = manager.getRepository(Batch);
      const supplierRepo = manager.getRepository(Supplier);
      const stockRepo = manager.getRepository(Stock);
      const logRepo = manager.getRepository(Log);

      const existingBatch = await batchRepo.findOne({
        where: { id },
        relations: ['stock', 'stock.batch', 'variant'], // ✅ IMPORTANT
      });

      if (!existingBatch) {
        throw new NotFoundException('Batch not found');
      }

      // 🔹 Merge updates
      const batch = batchRepo.merge(existingBatch, updateBatchDto);

      // 🔹 Supplier update (optional)
      if (updateBatchDto.supplierId) {
        const supplier = await supplierRepo.findOne({
          where: { id: updateBatchDto.supplierId },
        });

        if (!supplier) {
          throw new NotFoundException('Supplier not found');
        }

        batch.supplier = supplier;
      }
      const today = new Date().toISOString().split('T')[0];
      const expiration = batch.expirationDate?.split('T')[0]; // safety

      if (!expiration) {
        batch.status = 'ok';
      } else if (expiration <= today) {
        batch.status = 'expired';
      } else {
        const threshold = batch.alertPeriodPerDay;

        // simple date-only difference (safe approach)
        const diffDays =
          (new Date(expiration).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24);

        if (diffDays <= threshold) {
          batch.status = 'expiring';
        } else {
          batch.status = 'ok';
        }
      }

      // =========================================================
      // ✅ Recompute STOCK STATUS
      // =========================================================
      const stock = batch.stock;

      if (!stock) {
        batch.stockQTYStatus = 'ok';
      } else {
        const qty = stock.quantity;

        if (qty === 0) {
          console.log('here');

          batch.stockQTYStatus = 'empty';
        } else if (qty <= batch.alertPeriodPerStock) {
          batch.stockQTYStatus = 'low';
        } else {
          batch.stockQTYStatus = 'ok';
        }
      }
      if (updateBatchDto.alertPeriodPerDay == null) {
        batch.status = 'ok';
      }
      if (updateBatchDto.alertPeriodPerStock == null) {
        batch.stockQTYStatus = 'ok';
      }
      if (updateBatchDto.primary) {
        await this.updateBatchPrimaryStatus(batch.variant.id);
        await batchRepo.save(batch);
        return;
      } else {
        await batchRepo.save(batch);
        await this.checkBatchPrimaryStatus(batch.variant.id);
        return;
      }
    });
  }
  async checkBatchPrimaryStatus(variantId: number) {
    const batch = await this.batchRepository.find({
      where: { primary: true, variant: { id: variantId } },
    });

    if (batch.length === 0) {
      const batches = await this.batchRepository.find({
        where: { expirationDate: IsNull(), variant: { id: variantId } },
        relations: ['stock'],
        order: {
          stock: {
            quantity: 'ASC',
          },
        },
      });
      if (batches && batches.length > 0) {
        batches[0].primary = true;
        await this.batchRepository.save(batches[0]);
      } else {
        const batches = await this.batchRepository.find({
          where: { variant: { id: variantId } },
          order: { expirationDate: 'ASC' },
        });
        if (batches && batches.length > 0) {
          batches[0].primary = true;
          await this.batchRepository.save(batches[0]);
        }
      }
    }
    return;
  }
  async updateBatchPrimaryStatus(variantId: number) {
    let [batches, total] = await this.batchRepository.findAndCount({
      where: { primary: true, variant: { id: variantId } },
    });
    if (!batches || total === 0) {
      return;
    }
    for (const batch of batches) {
      batch.primary = false;
      await this.batchRepository.save(batch);
    }
  }

  async remove(id: number) {
    const batch = await this.findOne(id);
    await this.batchRepository.remove(batch);
    await this.checkBatchPrimaryStatus(batch.variant.id);
    return;
  }

  async getBatchByProductId(id: number) {
    const batch = await this.batchRepository.findOne({
      where: { variant: { product: { id } } },
      relations: ['supplier', 'stock'],
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    return batch;
  }
  async getLowStockBatches(page: number, limit: number) {
    const [items, total] = await this.batchRepository.findAndCount({
      where: { stockQTYStatus: 'low' },
      relations: ['stock', 'variant'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getEmptyBatches(page: number, limit: number) {
    const [items, total] = await this.batchRepository.findAndCount({
      where: { stockQTYStatus: 'empty' },
      relations: ['stock', 'variant'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getNormalBatches(page: number, limit: number) {
    const [items, total] = await this.batchRepository.findAndCount({
      where: { stockQTYStatus: 'ok' },
      relations: ['stock', 'variant'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getAllBatchesOfVariant(
    id: number,
    page: string,
    limit: string,
    search?: string,
  ) {
    const variantRepo = this.dataSource.getRepository(ProductVariant);
    const variant = await variantRepo.findOne({ where: { id } });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    const [items, total] = await this.batchRepository.findAndCount({
      where: {
        variant: { id },
        ...(search ? { nLot: ILike(`%${search}%`) } : {}),
      },
      take: +limit,
      skip: (+page - 1) * +limit,
      relations: ['stock', 'supplier'],
    });
    return {
      variant,
      data: items,
      meta: {
        total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / +limit),
      },
    };
  }
  async updateBatchStatus(id: number) {
    const batch = await this.findOne(id);
    const nowDate = new Date();
    if (!batch.expirationDate) {
      batch.status = 'ok';
    } else {
      const expiration = new Date(batch.expirationDate);

      if (nowDate > expiration) {
        batch.status = 'expired';
      } else {
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.floor(
          (expiration.getTime() - nowDate.getTime()) / msPerDay,
        );

        if (daysLeft <= 0) {
          batch.status = 'expired';
        } else if (
          batch.alertPeriodPerDay !== null &&
          batch.alertPeriodPerDay !== undefined &&
          daysLeft <= batch.alertPeriodPerDay
        ) {
          batch.status = 'expiring';
        } else {
          batch.status = 'ok';
        }
      }
    }

    const stock = batch.stock;

    if (
      batch.alertPeriodPerStock === null ||
      batch.alertPeriodPerStock === undefined
    ) {
      batch.stockQTYStatus = 'ok';
    } else {
      const qty = stock.quantity;

      if (qty === 0) {
        batch.stockQTYStatus = 'empty';
      } else if (qty <= batch.alertPeriodPerStock) {
        batch.stockQTYStatus = 'low';
      } else {
        batch.stockQTYStatus = 'ok';
      }
    }
    await this.batchRepository.save(batch);
  }
  async alert() {
    const batches = await this.batchRepository.find({
      where: [
        { status: 'expiring' },
        { stockQTYStatus: 'low' },
        { status: 'expired' },
      ],
    });
    console.log(batches);

    return batches;
  }
}
