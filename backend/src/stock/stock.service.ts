import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Batch } from 'src/batch/entities/batch.entity';
import { Stock } from './entities/stock.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, LessThan, Like, Repository } from 'typeorm';
import { Log } from 'src/logs/entities/log.entity';
import { Types, Actions, Reasons } from 'src/utils/actions';
import { BatchService } from 'src/batch/batch.service';

@Injectable()
export class StockService {
  logRepo: Repository<Log>;
  constructor(
    @InjectRepository(Stock) private stockRepository: Repository<Stock>,

    private readonly datasource: DataSource,
    @Inject(forwardRef(() => BatchService))
    private readonly batchService: BatchService,
  ) {
    this.logRepo = this.datasource.getRepository(Log);
  }
  async create(createStockDto: CreateStockDto, batch: Batch) {
    const stock = this.stockRepository.create(createStockDto);
    stock.batch = batch;
    console.log(stock);
    return await this.stockRepository.save(stock);
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    stockStatus?: string,
  ) {
    console.log(status, stockStatus);

    if (search) {
      const [items, total] = await this.stockRepository.findAndCount({
        where: [
          { batch: { variant: { name: ILike(`%${search}%`) } } },
          { batch: { variant: { barcode: Like(`%${search}%`) } } },
          { batch: { status: ILike(`%${status}%`) } },
          { batch: { stockQTYStatus: ILike(`%${stockStatus}%`) } },
        ],
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'batch',
          'batch.variant',
          'batch.supplier',
          'batch.variant.product',
        ],
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    if (status) {
      const [items, total] = await this.stockRepository.findAndCount({
        where: [{ batch: { status: ILike(`%${status}%`) } }],
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'batch',
          'batch.variant',
          'batch.variant.product',
          'batch.supplier',
        ],
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    if (stockStatus) {
      const [items, total] = await this.stockRepository.findAndCount({
        where: [{ batch: { stockQTYStatus: ILike(`%${stockStatus}%`) } }],
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'batch',
          'batch.variant',
          'batch.variant.product',
          'batch.supplier',
        ],
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [items, total] = await this.stockRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: [
        'batch',
        'batch.variant',
        'batch.variant.product',
        'batch.supplier',
      ],
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getStockByBarcode(barcode: string) {
    const stock = await this.stockRepository.findOne({
      where: { batch: { variant: { barcode } } },
      relations: ['batch', 'batch.variant'],
    });
    if (!stock) {
      throw new NotFoundException('Stock not found');
    }
    return stock;
  }

  async findOne(id: number) {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['batch'],
    });
    if (!stock) {
      throw new NotFoundException('Stock not found');
    }
    return stock;
  }

  async update(id: number, updateStockDto: UpdateStockDto) {
    const stock = await this.stockRepository.preload({
      id,
      ...updateStockDto,
    });
    if (!stock) {
      throw new NotFoundException('Stock not found');
    }
    return this.stockRepository.save(stock);
  }

  async remove(id: number) {
    const stock = await this.findOne(id);
    return await this.stockRepository.remove(stock);
  }

  //dev only
  async cleareAll() {
    return await this.stockRepository.clear();
  }

  async removeFromStock(id: number, dto: UpdateStockDto) {
    // 1. Fetch stock and batch together
    // Assuming 'id' is the Batch ID based on your query { batch: { id } }
    const stock = await this.stockRepository.findOne({
      where: { batch: { id } },
      relations: ['batch'],
    });

    if (!stock) {
      throw new NotFoundException('Stock not found for this batch');
    }

    // 2. Calculate new quantity (ensure it doesn't go below 0)
    const newQuantity = Math.max(0, stock.quantity - dto.quantity);
    stock.quantity = newQuantity;

    // 4. Create the Log
    const log = this.logRepo.create({
      entityType: Types.STOCK,
      action: Actions.REMOVE,
      reason: dto.reason,
      quantity: dto.quantity,
      stock: stock,
      timestamp: new Date().toISOString(),
    });

    // 5. Execute saves
    await this.logRepo.save(log);
    const savedStock = await this.stockRepository.save(stock);
    await this.batchService.update(savedStock.batch.id, {
      ...savedStock.batch,
    });
    return savedStock;
  }
  async addToStock(id: number, dto: UpdateStockDto) {
    // 1. Fetch stock with batch relation in one go
    const stock = await this.stockRepository.findOne({
      where: { batch: { id } },
      relations: ['batch'],
    });

    if (!stock) {
      throw new NotFoundException('Stock not found');
    }

    // 2. Update quantity
    stock.quantity += dto.quantity;

    // 4. Create the log entry
    const log = this.logRepo.create({
      entityType: Types.STOCK,
      action: Actions.ADD,
      reason: dto.reason,
      quantity: dto.quantity,
      stock: stock,
      timestamp: new Date().toISOString(),
    });

    await Promise.all([
      this.logRepo.save(log),
      this.stockRepository.save(stock),
    ]);
    await this.batchService.updateBatchStatus(stock.batch.id);

    return stock;
  }
  async getExpiredStock() {
    const stocks = await this.stockRepository.find({
      where: {
        batch: { expirationDate: LessThan(new Date().toISOString()) },
      },
      relations: ['batch'],
    });
    return stocks;
  }
}
