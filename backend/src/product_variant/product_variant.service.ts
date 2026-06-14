import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductVariantDto } from './dto/create-product_variant.dto';
import { UpdateProductVariantDto } from './dto/update-product_variant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, IsNull, Like, MoreThan, Repository } from 'typeorm';
import { ProductVariant } from './entities/product_variant.entity';
import { ProductService } from 'src/product/product.service';
import { Batch } from 'src/batch/entities/batch.entity';
import { Stock } from 'src/stock/entities/stock.entity';
import { Product } from 'src/product/entities/product.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import * as bwipjs from 'bwip-js';

@Injectable()
export class ProductVariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    private readonly productService: ProductService,
    private readonly dataSource: DataSource,
  ) {}
  async create(createDto: CreateProductVariantDto) {
    return await this.dataSource.transaction(async (manager) => {
      const variantRepo = manager.getRepository(ProductVariant);
      const batchRepo = manager.getRepository(Batch);
      const stockRepo = manager.getRepository(Stock);
      const supplierRepo = manager.getRepository(Supplier);
      const product = await this.productService.findOne(createDto.productId);

      const variant = variantRepo.create({
        name: createDto.name,
        product,
        createdAt: createDto.createdAt,
        updatedAt: createDto.updatedAt,
        size: createDto.size,
        color: createDto.color,
        weight: createDto.weight,
        height: createDto.height,
        flavor: createDto.flavor,
        barcode: createDto.barcode,
        PPA: createDto.PPA,
        purchasePrice: createDto.purchasePrice,
        sellingPriceHT: createDto.sellingPriceHT,
        profit: createDto.profit,
        profitRate: createDto.profitRate,
        sellingPriceTTC: createDto.sellingPriceTTC,
        promotionPrice: createDto.promotionPrice,
        promotionRate: createDto.promotionRate,
        vatRate: createDto.vatRate,
      });

      const savedVariant = await variantRepo.save(variant);
      let supplier: Supplier | null = null;
      if (createDto.supplierId) {
        supplier = await supplierRepo.findOne({
          where: { id: createDto.supplierId },
        });
        if (!supplier) {
          throw new NotFoundException('supplier not found');
        }
      }
      const batch = batchRepo.create({
        fabricationDate: createDto.fabricationDate,
        expirationDate: createDto.expirationDate,
        createdAt: createDto.createdAt,
        updatedAt: createDto.updatedAt,
        variant: savedVariant,
        alertPeriodPerDay: createDto.alertPeriodPerDay,
        supplier: supplier?.id ? supplier : undefined,
        alertPeriodPerStock: createDto.alertPeriodPerStock,
        nLot: createDto.nLot,
      });

      const savedBatch = await batchRepo.save(batch);

      const stock = stockRepo.create({
        quantity: createDto.quantity,
        createdAt: createDto.createdAt,
        updatedAt: createDto.updatedAt,
        batch: savedBatch,
      });

      await stockRepo.save(stock);

      batch.stock = stock;
      await batchRepo.save(batch);

      return variant;
    });
  }

  async findAll(page: number, limit: number, search?: string) {
    if (search) {
      const [items, total] = await this.productVariantRepository.findAndCount({
        where: { name: ILike(`%${search}%`) },
        relations: ['batches', 'batches.stock'],
        take: limit,
        skip: (page - 1) * limit,
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [items, total] = await this.productVariantRepository.findAndCount({
      relations: ['product'],
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findByBarceode(barcode: string) {
    return await this.productVariantRepository.findOne({
      where: { barcode: ILike(`%${barcode}%`) },
      relations: ['product', 'batches', 'batches.stock'],
    });
  }

  async findOne(id: number) {
    const productVariant = await this.productVariantRepository.findOne({
      where: { id },
      relations: ['batches'],
      select: {
        batches: {
          id: true,
        },
      },
    });
    if (!productVariant) {
      throw new NotFoundException('Product not found');
    }
    return productVariant;
  }
  async getAllVariantsOfProduct(
    productId: number,
    page: number,
    limit: number,
    search?: string,
  ) {
    const productRepo = this.dataSource.getRepository(Product);
    const product = await productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (search) {
      const [items, total] = await this.productVariantRepository.findAndCount({
        where: [
          { product: { id: productId }, name: ILike(`%${search}%`) },
          { product: { id: productId }, barcode: Like(`%${search}%`) },
        ],
        take: limit,
        skip: (page - 1) * limit,
        relations: ['batches'],
        select: { batches: { id: true, nLot: true } },
      });

      return {
        product,
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [items, total] = await this.productVariantRepository.findAndCount({
      where: { product: { id: productId } },

      take: limit,
      skip: (page - 1) * limit,
      relations: ['batches'],
      select: { batches: { id: true, nLot: true } },
    });
    return {
      product,
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getSallableVariants(page: number, limit: number, search?: string) {
    const [items, total] = await this.productVariantRepository.findAndCount({
      where: [
        {
          name: ILike(`%${search}%`),
          batches: { primary: true, stock: { quantity: MoreThan(0) } },
        },
        {
          barcode: ILike(`%${search}%`),
          batches: { primary: true, stock: { quantity: MoreThan(0) } },
        },
        {
          product: { name: ILike(`%${search}%`) },
          batches: { primary: true, stock: { quantity: MoreThan(0) } },
        },
      ],
      take: limit,
      skip: (page - 1) * limit,
      relations: ['batches', 'product', 'batches.stock'],
      select: { batches: { id: true, nLot: true, stock: { quantity: true } } },
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getAllSallableVariants(page: number, limit: number, search?: string) {
    const [items, total] = await this.productVariantRepository.findAndCount({
      where: [
        {
          name: ILike(`%${search}%`),
          batches: { stock: { quantity: MoreThan(0) } },
        },
        {
          barcode: ILike(`%${search}%`),
          batches: { stock: { quantity: MoreThan(0) } },
        },
        {
          product: { name: ILike(`%${search}%`) },
          batches: { stock: { quantity: MoreThan(0) } },
        },
        {
          batches: {
            nLot: ILike(`%${search}%`),
            stock: { quantity: MoreThan(0) },
          },
        },
      ],
      take: limit,
      skip: (page - 1) * limit,
      relations: ['batches', 'product', 'batches.stock'],
      select: {
        batches: {
          id: true,
          nLot: true,
          stock: { quantity: true },
          expirationDate: true,
          fabricationDate: true,
        },
      },
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getAllPurchasableVariants(
    page: number,
    limit: number,
    search?: string,
  ) {
    const [items, total] = await this.productVariantRepository.findAndCount({
      where: [
        {
          name: ILike(`%${search}%`),
        },
        {
          barcode: ILike(`%${search}%`),
        },
        {
          product: { name: ILike(`%${search}%`) },
        },
        {
          batches: {
            nLot: ILike(`%${search}%`),
          },
        },
      ],
      take: limit,
      skip: (page - 1) * limit,
      relations: ['batches', 'product', 'batches.stock'],
      select: {
        batches: {
          id: true,
          nLot: true,
          stock: { quantity: true },
          expirationDate: true,
          fabricationDate: true,
        },
      },
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async update(id: number, updateProductVariantDto: UpdateProductVariantDto) {
    const productVariant = await this.productVariantRepository.preload({
      id,
      ...updateProductVariantDto,
    });
    if (!productVariant) throw new NotFoundException('Product not found');
    if (updateProductVariantDto.productId) {
      const product = await this.productService.findOne(
        updateProductVariantDto.productId,
      );
      productVariant.product = product;
    }
    return await this.productVariantRepository.save(productVariant);
  }

  async remove(id: number) {
    const productVariant = await this.findOne(id);
    return await this.productVariantRepository.remove(productVariant);
  }

  //dev only
  async cleareAll() {
    return await this.productVariantRepository.clear();
  }
  generateEAN13(): string {
    const digits = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 10),
    );

    const sum = digits.reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);

    const checkDigit = (10 - (sum % 10)) % 10;

    return digits.join('') + checkDigit;
  }
  async generateUniqueBarcode(): Promise<string> {
    let code: string;

    do {
      code = this.generateEAN13();
    } while (
      await this.productVariantRepository.findOne({ where: { barcode: code } })
    );

    return code;
  }
  async generateBarcodeBuffer(text: string): Promise<Buffer> {
  try {
    return await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 15,
      includetext: true,
      textxalign: 'center',
    });
  } catch (error) {
    throw new InternalServerErrorException(`Barcode error: ${error.message}`);
  }
}
}
