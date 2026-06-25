import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CategoryService } from 'src/category/category.service';
import { error } from 'console';
import { Actions, Types } from 'src/utils/actions';
import { Log } from 'src/logs/entities/log.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly categoryService: CategoryService,
    private readonly dataSource: DataSource,
  ) {}
  async create(createProductDto: CreateProductDto) {
    if (createProductDto.categoryId) {
      const category = await this.categoryService.findOne(
        createProductDto.categoryId,
      );
      const product = this.productRepository.create({
        ...createProductDto,
        category,
      });
      return await this.productRepository.save(product);
    } else {
      const product = this.productRepository.create({
        ...createProductDto,
      });
      await this.dataSource.manager.save(Log, {
        action: Actions.CREATE,
        entityType: Types.PRODUCT,
        timestamp: new Date().toISOString(),
      });
      return await this.productRepository.save(product);
    }
  }

  async findAll(page: number, limit: number, search?: string) {
    if (search) {
      const [items, total] = await this.productRepository.findAndCount({
        where: [
          { name: ILike(`%${search}%`) },
          { category: { name: ILike(`%${search}%`) } },
          { variants: { barcode: ILike(`%${search}%`) } },
        ],
        relations: ['category', 'variants.batches.supplier'],
        take: limit,
        skip: (page - 1) * limit,
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
    const [items, total] = await this.productRepository.findAndCount({
      relations: ['category'],
      take: limit,
      skip: (page - 1) * limit,
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
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'variants'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    console.log(updateProductDto);
    const product = await this.productRepository.preload({
      id,
      ...updateProductDto,
    });
    if (!product) throw new NotFoundException('Product not found');

    if (updateProductDto.categoryId != 0) {
      const category = await this.categoryService.findOne(
        updateProductDto.categoryId!,
      );
      product.category = category;
    } else {
      product.category = null as any;
    }
    return await this.productRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    await this.dataSource.manager.save(Log, {
      action: Actions.DELETE,
      entityType: Types.PRODUCT,
      timestamp: new Date().toISOString(),
    });
    return this.productRepository.remove(product);
  }
}
