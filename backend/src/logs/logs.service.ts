import { Injectable } from '@nestjs/common';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateLogDto } from './dto/update-log.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Log } from './entities/log.entity';

@Injectable()
export class LogsService {
  constructor(@InjectRepository(Log) private logRepository: Repository<Log>) {}
  create(createLogDto: CreateLogDto) {
    return 'This action adds a new log';
  }

  async findAll(page: number, limit: number, search?: string) {
    if (search) {
      const [logs, total] = await this.logRepository.findAndCount({
        where: { entityType: ILike(`%${search}%`) },
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'stock',
          'batch',
          'credit',
          'sale',
          'stockPayment',
          'client',
          'supplier',
        ],
        order: { id: 'DESC' },
      });
      return {
        data: logs,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [logs, total] = await this.logRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: [
        'stock',
        'batch',
        'credit',
        'sale',
        'stockPayment',
        'client',
        'supplier',
      ],
      order: { id: 'DESC' },
    });
    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} log`;
  }

  update(id: number, updateLogDto: UpdateLogDto) {
    return `This action updates a #${id} log`;
  }

  //dev
  cleareAll() {
    return this.logRepository.clear();
  }
}
