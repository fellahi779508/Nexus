import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, MoreThan, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreditService } from 'src/credit/credit.service';
import { Log } from 'src/logs/entities/log.entity';
import { Actions, Reasons, Types } from 'src/utils/actions';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client) private clientRepository: Repository<Client>,
    private readonly creditService: CreditService,
    private readonly dataSource: DataSource,
  ) {}
  create(createClientDto: CreateClientDto) {
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  async findAll(page: number, limit: number, search?: string) {
    const query: any = {
      where: search ? { name: ILike(`%${search}%`) } : undefined,
      skip: limit > 0 ? (page - 1) * limit : undefined,
      relations: ['sales', 'sales.credit'],
    };

    // Only add take if limit > 0
    if (limit > 0) {
      query.take = limit;
    }

    const [items, total] = await this.clientRepository.findAndCount(query);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        pages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
    };
  }

  async findOne(id: number) {
    const client = this.clientRepository.findOne({
      where: { id },
      relations: ['sales', 'sales.credit'],
      order: {
        sales: {
          id: 'DESC',
        },
      },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    const client = await this.clientRepository.preload({
      id,
      ...updateClientDto,
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    if (updateClientDto.creditTTC) {
      await this.dataSource.manager.save(Log, {
        action: Actions.PAYMENT,
        entityType: Types.CLIENT,
        reason: Reasons.PAID,

        timestamp: new Date().toISOString(),
        client,
      });
    }
    if (client.creditTTC === 0) {
      await this.creditService.removeCreditsOfClientById(client.id);
      await this.dataSource.manager.save(Log, {
        action: Actions.PAYMENT,
        entityType: Types.CLIENT,
        reason: Reasons.PAID,
        timestamp: new Date().toISOString(),
        client,
      });
    }
    return await this.clientRepository.save(client);
  }

  async remove(id: number) {
    const client = await this.findOne(id);
    await this.clientRepository.remove(client!);
    await this.dataSource.manager.save(Log, {
      action: Actions.DELETE,
      entityType: Types.CLIENT,
      timestamp: new Date().toISOString(),
    });
    return 'done';
  }
  async getCredits(
    page: number,
    limit: number,
    search?: string,
    date?: string,
  ) {
    const [items, total] = await this.clientRepository.findAndCount({
      where: {
        creditTTC: MoreThan(0),
        name: ILike(`%${search}%`),
        createdAt: date ? ILike(`%${date}%`) : undefined,
      },
      take: limit,
      skip: (page - 1) * limit,
    });
    let totalCredit = 0;
    for (const client of items) {
      totalCredit += client.creditTTC;
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
