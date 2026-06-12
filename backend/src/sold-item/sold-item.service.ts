import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSoldItemDto } from './dto/create-sold-item.dto';
import { UpdateSoldItemDto } from './dto/update-sold-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { SoldItem } from './entities/sold-item.entity';

@Injectable()
export class SoldItemService {
  constructor(
    @InjectRepository(SoldItem)
    private soldItemRepository: Repository<SoldItem>,
  ) {}
  async create(createSoldItemDto: CreateSoldItemDto) {
    const soldItem = this.soldItemRepository.create(createSoldItemDto);
    return await this.soldItemRepository.save(soldItem);
  }

  async findAll(page: number, limit: number, search?: string) {
    if (search) {
      const [items, total] = await this.soldItemRepository.findAndCount({
        where: { batch: { variant: { name: ILike(`%${search}%`) } } },
        take: limit,
        skip: (page - 1) * limit,
        relations: ['batch', 'batch.variant'],
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [items, total] = await this.soldItemRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['batch'],
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const item = await this.soldItemRepository.findOneBy({ id: id });
    if (!item) {
      throw new NotFoundException('Item not found');
    }
    return item;
  }

  async update(id: number, updateSoldItemDto: UpdateSoldItemDto) {
    const item = await this.soldItemRepository.preload({
      ...updateSoldItemDto,
      id,
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }
    return await this.soldItemRepository.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    return await this.soldItemRepository.remove(item);
  }
}
