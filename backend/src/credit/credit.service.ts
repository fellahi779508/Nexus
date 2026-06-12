import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Credit } from './entities/credit.entity';
import { DataSource, Repository } from 'typeorm';
import { Sale } from 'src/sale/entities/sale.entity';
import { Client } from 'src/client/entities/client.entity';
import { StockPayment } from 'src/stock-payment/entities/stock-payment.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { create } from 'domain';
import { async } from 'rxjs';
import { Log } from 'src/logs/entities/log.entity';
import { Actions, Types } from 'src/utils/actions';

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(Credit) private readonly creditRepo: Repository<Credit>,
    private readonly dataSource: DataSource,
  ) {}
  async removeCreditsOfClientById(clientId: number) {
    const credits = await this.creditRepo.find({
      where: { sale: { client: { id: clientId } } },
    });
    const sales = await this.dataSource.manager.find(Sale, {
      where: { client: { id: clientId } },
    });
    const client = await this.dataSource.manager.findOne(Client, {
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException('client not found');
    }
    for (const sale of sales) {
      sale.paid = sale.total;
      await this.dataSource.manager.save(sale);
    }
    client.creditTTC = 0;
    await this.dataSource.manager.save(Log, {
      action: Actions.REMOVE_CREDIT,
      entityType: Types.CLIENT,
      timestamp: new Date().toISOString(),
      client,
    });

    await this.dataSource.manager.save(client);
    await this.creditRepo.remove(credits);
    return 'done';
  }
  async removeCreditsOfSupplierById(supplierId: number) {
    const credits = await this.creditRepo.find({
      where: { stockPayment: { supplier: { id: supplierId } } },
    });
    const stockPayments = await this.dataSource.manager.find(StockPayment, {
      where: { supplier: { id: supplierId } },
    });
    const supplier = await this.dataSource.manager.findOne(Supplier, {
      where: { id: supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('supplier not found');
    }
    for (const purchase of stockPayments) {
      purchase.paid = purchase.total;
      await this.dataSource.manager.save(purchase);
    }
    supplier.creditTTC = 0;
    await this.dataSource.manager.save(supplier);
    await this.creditRepo.remove(credits);
    return 'done';
  }

  create(createCreditDto: CreateCreditDto) {
    return 'This action adds a new credit';
  }

  findAll() {
    return `This action returns all credit`;
  }

  findOne(id: number) {
    return `This action returns a #${id} credit`;
  }

  update(id: number, updateCreditDto: UpdateCreditDto) {
    return `This action updates a #${id} credit`;
  }

  remove(id: number) {
    return `This action removes a #${id} credit`;
  }
}
