import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { privateDecrypt } from 'crypto';
import { DataSource, ILike, MoreThan, Repository } from 'typeorm';
import { CreditService } from 'src/credit/credit.service';
import { Actions, Types } from 'src/utils/actions';
import { Log } from 'src/logs/entities/log.entity';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly creditService: CreditService,
    private readonly dataSource: DataSource,
  ) {}
  create(createSupplierDto: CreateSupplierDto) {
    const supplier = this.supplierRepository.create(createSupplierDto);
    return this.supplierRepository.save(supplier);
  }

  async findAll(page: number, limit: number, search?: string) {
    if (search) {
      const [items, total] = await this.supplierRepository.findAndCount({
        where: {
          name: ILike(`%${search}%`),
        },
        skip: (page - 1) * limit,
        take: limit,
        relations: ['stockPayments', 'stockPayments.credit'],
      });
      return {
        data: items,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    }
    const [items, total] = await this.supplierRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['stockPayments', 'stockPayments.credit'],
    });
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const supplier = await this.supplierRepository.findOne({
      where: { id },
      relations: [
        'stockPayments',
        'stockPayments.purchasedItems',
        'stockPayments.credit',
        'stockPayments.purchasedItems.batch',
        'stockPayments.purchasedItems.batch.variant',
      ],
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.supplierRepository.preload({
      id,
      ...updateSupplierDto,
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    if (supplier.creditTTC === 0) {
      await this.creditService.removeCreditsOfSupplierById(supplier.id);
    }
    await this.dataSource.manager.save(Log, {
      action: Actions.PAYMENT,
      entityType: Types.SUPPLIER,
      timestamp: new Date().toISOString(),
      quantity: updateSupplierDto.creditTTC,
      supplier,
    });
    return this.supplierRepository.save(supplier);
  }

  async remove(id: number) {
    const supplier = await this.findOne(id);
    await this.supplierRepository.remove(supplier);
    return 'success';
  }
  async getCredits(
    page: number,
    limit: number,
    search?: string,
    date?: string,
  ) {
    const [items, total] = await this.supplierRepository.findAndCount({
      where: {
        creditTTC: MoreThan(0),
        name: ILike(`%${search}%`),
        createdAt: date ? ILike(`%${date}%`) : undefined,
      },
      take: limit,
      skip: (page - 1) * limit,
    });
    let totalCredit = 0;
    for (const supplier of items) {
      totalCredit += supplier.creditTTC;
    }
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        pages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
      totalCredit,
    };
  }
}
