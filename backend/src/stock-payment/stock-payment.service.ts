import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStockPaymentDto } from './dto/create-stock-payment.dto';
import { UpdateStockPaymentDto } from './dto/update-stock-payment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { StockPayment } from './entities/stock-payment.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Batch } from 'src/batch/entities/batch.entity';
import { Log } from 'src/logs/entities/log.entity';
import { Actions, Reasons, Types } from 'src/utils/actions';
import { Stock } from 'src/stock/entities/stock.entity';
import { PurchasedItem } from 'src/purchased-item/entities/purchased-item.entity';
import { Credit } from 'src/credit/entities/credit.entity';
import PDFDocument from 'pdfkit';
import { Owner } from 'src/owner/entities/owner.entity';

@Injectable()
export class StockPaymentService {
  constructor(
    @InjectRepository(StockPayment)
    private stockPaymentRepository: Repository<StockPayment>,
    private readonly datasource: DataSource,
  ) {}
  async create(createStockPaymentDto: CreateStockPaymentDto) {
    return this.datasource.transaction(async (manager) => {
      // 1. Initialize all repositories from the transaction manager
      const batchRepo = manager.getRepository(Batch);
      const stockRepo = manager.getRepository(Stock);
      const stockPaymentRepo = manager.getRepository(StockPayment); // Replaces this.stockPaymentRepository
      const supplierRepo = manager.getRepository(Supplier);
      const creditRepo = manager.getRepository(Credit);
      const logRepo = manager.getRepository(Log);
      const purchasedItemRepo = manager.getRepository(PurchasedItem);

      // 2. Create and save the main StockPayment entity
      const stockPayment = stockPaymentRepo.create(createStockPaymentDto);

      if (createStockPaymentDto.supplierId) {
        const supplier = await supplierRepo.findOne({
          where: { id: createStockPaymentDto.supplierId },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');
        stockPayment.supplier = supplier;
      }

      const savedPayment = await stockPaymentRepo.save(stockPayment);

      // 3. Loop through purchased items
      for (const item of createStockPaymentDto.purchasedItems) {
        const batch = await batchRepo.findOne({
          where: { id: item.batchId },
          relations: ['stock', 'variant'],
        });
        if (!batch) throw new NotFoundException('Batch not found');

        // Create purchased item
        const purchasedItemEntity = purchasedItemRepo.create({
          quantity: item.quantity,
          unit: item.unit,
          qtePerUnit: item.qtePerUnit,
          total: item.quantity * batch.variant.sellingPriceTTC,
          batch,
          stockPayment: { id: savedPayment.id },
          sellingPrice: item.sellingPrice,
        });
        await purchasedItemRepo.save(purchasedItemEntity);

        // Update Stock
        const stock = batch.stock;
        let totalQte = 0;

        if (item.unit === 'package') {
          totalQte = item.quantity * item.qtePerUnit;
          stock.quantity += totalQte; // Adding for purchase
        } else {
          totalQte = item.quantity;
          stock.quantity += totalQte; // Adding for purchase
        }
        await stockRepo.save(stock);

        // Per-item Stock Log
        const stockLog = logRepo.create({
          entityType: Types.STOCK,
          action: Actions.ADD,
          reason: Reasons.REFILL,
          quantity: totalQte,
          stock: stock,
          stockPayment: { id: savedPayment.id },
          timestamp: new Date().toISOString(),
        });
        await logRepo.save(stockLog);

        // Optional: Call batch update if you do this for purchases too
        // await this.batchService.updateBatchStatus(batch.id);
      }

      // 4. Handle Credits
      if (createStockPaymentDto.total !== createStockPaymentDto.paid) {
        const credit = creditRepo.create({
          amount: createStockPaymentDto.total - createStockPaymentDto.paid,
          stockPayment: { id: savedPayment.id },
          date: new Date().toISOString(),
        });
        stockPayment.supplier.creditTTC += credit.amount;
        await supplierRepo.save(stockPayment.supplier);
        await creditRepo.save(credit);

        const creditLog = logRepo.create({
          action: Actions.NEW_CREDIT,
          credit: credit,
          entityType: Types.CREDIT,
          stockPayment: { id: savedPayment.id },
          timestamp: new Date().toISOString(),
        });
        const supplierLog = logRepo.create({
          action: Actions.NEW_CREDIT,
          supplier: stockPayment.supplier,
          entityType: Types.SUPPLIER,
          stockPayment: { id: savedPayment.id },
          timestamp: new Date().toISOString(),
        });
        await logRepo.save(creditLog);
      }

      // 5. Final log for the Stock Payment
      const paymentLog = logRepo.create({
        action: Actions.NEW_PURCHASE,
        stockPayment: { id: savedPayment.id },
        entityType: Types.STOCK_PAYMENT,
        timestamp: new Date().toISOString(),
      });
      await logRepo.save(paymentLog);

      return savedPayment;
    });
  }
  async findAll(page: number, limit: number, search?: string) {
    const sumQuery = this.stockPaymentRepository.createQueryBuilder('payment');

    if (search) {
      sumQuery
        .leftJoin('payment.supplier', 'supplier')
        .where('supplier.name ILIKE :search', {
          search: `%${search}%`,
        });
    }

    const sumResult = await sumQuery
      .select('COALESCE(SUM(payment.total), 0)', 'totalAmount')
      .getRawOne();

    const totalAmount = Number(sumResult.totalAmount);

    let items;
    let count;

    if (search) {
      [items, count] = await this.stockPaymentRepository.findAndCount({
        where: {
          supplier: {
            name: ILike(`%${search}%`),
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'supplier',
          'credit',
          'purchasedItems',
          'purchasedItems.batch',
        ],
        order: { id: 'DESC' },
      });
    } else {
      [items, count] = await this.stockPaymentRepository.findAndCount({
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'supplier',
          'credit',
          'purchasedItems',
          'purchasedItems.batch',
        ],
        order: { id: 'DESC' },
      });
    }

    return {
      data: items,
      meta: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
      totalAmount,
    };
  }
  async findOne(id: number) {
    const stockPayment = await this.stockPaymentRepository.findOne({
      where: { id },
      relations: [
        'supplier',
        'credit',
        'purchasedItems',
        'purchasedItems.batch',
        'purchasedItems.batch.variant',
        'purchasedItems.batch.variant.product',
      ],
    });

    if (!stockPayment) throw new NotFoundException('Stock payment not found');
    return stockPayment;
  }

  async update(id: number, dto: UpdateStockPaymentDto) {
    return await this.datasource.transaction(async (manager) => {
      const stockPaymentRepo = manager.getRepository(StockPayment);
      const stockRepo = manager.getRepository(Stock);
      const purchasedItemRepo = manager.getRepository(PurchasedItem);
      const creditRepo = manager.getRepository(Credit);
      const logRepo = manager.getRepository(Log);
      const supplierRepo = manager.getRepository(Supplier);

      // 1. Fetch the purchase, including BOTH supplier and credit relations
      const stockPayment = await stockPaymentRepo.findOne({
        where: { id },
        relations: [
          'purchasedItems',
          'purchasedItems.batch',
          'supplier',
          'credit',
        ],
      });
      if (!stockPayment) throw new NotFoundException('Stock payment not found');

      // 2. Return previous quantities back to stock ATOMICALLY
      for (const item of stockPayment.purchasedItems) {
        await stockRepo.decrement(
          { batch: { id: item.batch.id } },
          'quantity',
          item.unit === 'package'
            ? item.qtePerUnit * item.quantity
            : item.quantity,
        );
      }

      // 3. Delete old items & Deduct old Credit Safely
      await purchasedItemRepo.delete({ stockPayment: { id: stockPayment.id } });

      if (stockPayment.supplier) {
        const oldSupplier = await supplierRepo.findOne({
          where: { id: stockPayment.supplier.id },
        });

        const oldCreditAmount =
          Number(stockPayment.total) - Number(stockPayment.paid);

        if (oldSupplier && oldCreditAmount > 0) {
          oldSupplier.creditTTC =
            Number(oldSupplier.creditTTC) - oldCreditAmount;
          await supplierRepo.save(oldSupplier);
        }
      }

      // FIX 1: Always wipe old credit records cleanly outside the conditional block
      await creditRepo.delete({ stockPayment: { id: stockPayment.id } });

      // 4. Update basic purchase properties (Cast to Numbers)
      stockPayment.paid = Number(dto.paid ?? stockPayment.paid);
      stockPayment.total = Number(dto.total ?? stockPayment.total);
      stockPayment.date = dto.date ?? stockPayment.date;
      stockPayment.remise = dto.remise ?? stockPayment.remise;
      stockPayment.isDetailed = dto.isDetailed ?? stockPayment.isDetailed;
      stockPayment.remiseAmount = dto.remiseAmount ?? stockPayment.remiseAmount;
      stockPayment.timbre = dto.timbre ?? stockPayment.timbre;

      // Determine which supplier ID we should be using
      const targetSupplierId =
        dto.supplierId !== undefined
          ? dto.supplierId
          : stockPayment.supplier?.id;

      // 5. Handle Supplier & Credit Assignment safely
      if (targetSupplierId) {
        const supplier = await supplierRepo.findOne({
          where: { id: targetSupplierId },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');

        stockPayment.supplier = supplier;

        // Calculate credit based on the verified properties
        const creditAmount = stockPayment.total - stockPayment.paid;

        if (creditAmount > 0) {
          const newCredit = creditRepo.create({
            stockPayment: { id: stockPayment.id },
            amount: creditAmount,
          });

          const savedCredit = await manager.save(newCredit);

          // FIX 2: Explicitly link the saved credit instance back to the entity memory reference
          stockPayment.credit = savedCredit;

          // Force Number casting to prevent string concatenation errors
          supplier.creditTTC = Number(supplier.creditTTC) + creditAmount;
          await supplierRepo.save(supplier);
        } else {
          stockPayment.credit = null as any;
        }
      } else {
        stockPayment.supplier = null as any;
        stockPayment.credit = null as any;
      }

      // Save basic Purchase info inside the transaction safely now
      const savedStockPayment = await stockPaymentRepo.save(stockPayment);

      // 6. Bulk Insert new purchased items & Add to Stock Atomically
      if (dto.purchasedItems && dto.purchasedItems.length > 0) {
        const purchasedItemsToCreate = dto.purchasedItems.map((item) =>
          purchasedItemRepo.create({
            stockPayment: { id: savedStockPayment.id },
            batch: { id: item.batchId },
            quantity: item.quantity,
            total: item.sellingPrice * item.quantity,
            qtePerUnit: item.qtePerUnit,
            unit: item.unit,
            sellingPrice: item.sellingPrice,
          }),
        );

        await purchasedItemRepo.save(purchasedItemsToCreate);

        for (const item of dto.purchasedItems) {
          await stockRepo.increment(
            { batch: { id: item.batchId } },
            'quantity',
            item.unit === 'package'
              ? item.qtePerUnit * item.quantity
              : item.quantity,
          );
        }
      }

      // 7. Write Log
      await logRepo.save(
        logRepo.create({
          action: 'update',
          entityType: Types.STOCK_PAYMENT,
          stockPayment: savedStockPayment,
          timestamp: new Date().toISOString(),
        }),
      );

      return savedStockPayment;
    });
  }
  async remove(id: number) {
    const stockPayment = await this.findOne(id);
    if (stockPayment.supplier) {
      const supplier = await this.datasource.manager.findOne(Supplier, {
        where: { id: stockPayment.supplier.id },
      });
      if (supplier) {
        supplier.creditTTC -= stockPayment.total - stockPayment.paid;
        await this.datasource.manager.save(Supplier, supplier);
      }
      if (stockPayment.credit) {
        stockPayment.supplier.creditTTC -= stockPayment.credit.amount;
        await this.datasource.manager.save(stockPayment.supplier);
      }
    }
    await this.datasource.manager.save(Log, {
      action: Actions.DELETE,
      entityType: Types.STOCK_PAYMENT,
      timestamp: new Date().toISOString(),
      stockPayment,
    });
    return await this.stockPaymentRepository.remove(stockPayment);
  }
  async getPurchasesOfTheDay() {
    const purchases = await this.stockPaymentRepository.find({
      where: {
        date: ILike(`%${new Date().toISOString().split('T')[0]}%`),
        isDetailed: false,
      },
      relations: [
        'supplier',
        'purchasedItems',
        'purchasedItems.batch',
        'purchasedItems.batch.variant',
        'purchasedItems.batch.variant.product',
        'credit',
      ],
      order: { id: 'DESC' },
    });

    return purchases;
  }

  async printPurchase(id: number, paperType: string): Promise<Buffer> {
    const purchase = await this.findOne(id); // must load: supplier, purchasedItems, batch, variant, product
    const owner = await this.datasource.manager.findOne(Owner, {
      where: { id: 1 },
    });

    const isTicket = paperType?.toLowerCase() === 'ticket';
    const pageWidth = isTicket ? 80 * 2.83465 : 595.28;
    const margin = isTicket ? 8 : 40;
    const doc = new PDFDocument({
      size: isTicket ? [pageWidth, 1000] : 'A4',
      margins: { top: margin, bottom: margin, left: margin, right: margin },
      autoFirstPage: true,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    const formatCurrency = (amount: number) =>
      `${(amount ?? 0).toFixed(2)} DZD`;

    // ------------------------------------------------------------
    // TICKET DESIGN – Style ticket de caisse, monospace, épuré
    // ------------------------------------------------------------
    if (isTicket) {
      const ticketWidth = pageWidth - margin * 2;

      if (owner) {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(owner.name || 'VOTRE BOUTIQUE', { align: 'center' });
        if (owner.address)
          doc
            .font('Helvetica')
            .fontSize(8)
            .text(owner.address, { align: 'center' });
        if (owner.phone)
          doc
            .font('Helvetica')
            .fontSize(8)
            .text(`Tél: ${owner.phone}`, { align: 'center' });
        doc.moveDown(0.3);
        doc
          .moveTo(margin, doc.y)
          .lineTo(margin + ticketWidth, doc.y)
          .dash(1, { space: 1 })
          .lineWidth(0.75)
          .strokeColor('#000000')
          .stroke()
          .undash();
        doc.moveDown(0.4);
      }

      // Titre
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`BON DE COMMANDE N°${purchase.id}`, { align: 'center' });
      doc.moveDown(0.3);

      // Date et paiement
      doc.font('Helvetica').fontSize(8);
      doc.text(
        `Date: ${purchase.date ? new Date(purchase.date).toLocaleString('fr-FR') : 'N/D'}`,
        { align: 'center' },
      );
      doc.text(`Paiement: ${purchase.payment_method || 'N/D'}`, {
        align: 'center',
      });
      if (purchase.timbre)
        doc.text(`Timbre: ${formatCurrency(purchase.timbre)}`, {
          align: 'center',
        });
      if (purchase.remise)
        doc.text(`Remise: -${formatCurrency(purchase.remiseAmount ?? 0)}`, {
          align: 'center',
        });
      doc.moveDown(0.3);
      doc
        .moveTo(margin, doc.y)
        .lineTo(margin + ticketWidth, doc.y)
        .dash(1, { space: 1 })
        .lineWidth(0.75)
        .strokeColor('#000000')
        .stroke()
        .undash();
      doc.moveDown(0.3);

      // Fournisseur
      if (purchase.supplier) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text('FOURNISSEUR', { align: 'center' });
        doc.font('Helvetica').fontSize(8);
        doc.text(purchase.supplier.name || '', { align: 'center' });
        if (purchase.supplier.address)
          doc.text(purchase.supplier.address, { align: 'center' });
        doc.text(`Tél: ${purchase.supplier.phone || ''}`, { align: 'center' });
        doc.moveDown(0.3);
        doc
          .moveTo(margin, doc.y)
          .lineTo(margin + ticketWidth, doc.y)
          .dash(1, { space: 1 })
          .lineWidth(0.75)
          .strokeColor('#000000')
          .stroke()
          .undash();
        doc.moveDown(0.3);
      }

      // Articles
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('ARTICLES', { align: 'center' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(8);

      for (const item of purchase.purchasedItems || []) {
        const variant = item?.batch?.variant;
        const variantName = `${variant.product.name} - ${variant.name ?? ''}`;
        const fullName = variantName;

        const quantity = item.quantity ?? 0;
        const unit =
          item.unit === 'package' ? `lot (${item.qtePerUnit ?? 0} u)` : 'u';
        const unitPrice = item.sellingPrice ?? 0;
        const lineTotal = quantity * unitPrice;

        doc.font('Helvetica-Bold').text(`${fullName}`, { align: 'left' });
        doc
          .font('Helvetica')
          .text(`  ${quantity} ${unit} x ${formatCurrency(unitPrice)}`, {
            align: 'left',
            continued: false,
          });
        doc
          .font('Helvetica-Bold')
          .text(`= ${formatCurrency(lineTotal)}`, { align: 'right' });
        doc.moveDown(0.2);
      }

      doc
        .moveTo(margin, doc.y)
        .lineTo(margin + ticketWidth, doc.y)
        .lineWidth(1)
        .strokeColor('#000000')
        .stroke();
      doc.moveDown(0.3);

      // Totaux
      const subtotal =
        (purchase.total ?? 0) -
        (purchase.timbre ?? 0) +
        (purchase.remiseAmount ?? 0);
      const dueAmount = (purchase.total ?? 0) - (purchase.paid ?? 0);

      doc.font('Helvetica').fontSize(8);
      doc.text(`Sous-total: ${formatCurrency(subtotal)}`, { align: 'right' });
      if (purchase.remise)
        doc.text(`Remise: -${formatCurrency(purchase.remiseAmount ?? 0)}`, {
          align: 'right',
        });
      if (purchase.timbre)
        doc.text(`Timbre: +${formatCurrency(purchase.timbre)}`, {
          align: 'right',
        });
      doc.moveDown(0.2);

      doc
        .moveTo(margin, doc.y)
        .lineTo(margin + ticketWidth, doc.y)
        .lineWidth(1)
        .strokeColor('#000000')
        .stroke();
      doc.moveDown(0.2);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`TOTAL: ${formatCurrency(purchase.total ?? 0)}`, {
          align: 'right',
        });
      doc.font('Helvetica').fontSize(8);
      doc.text(`Payé: ${formatCurrency(purchase.paid ?? 0)}`, {
        align: 'right',
      });
      doc
        .font('Helvetica-Bold')
        .text(`Dû au fournisseur: ${formatCurrency(dueAmount)}`, {
          align: 'right',
        });

      doc.moveDown(0.6);
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text('Merci pour votre approvisionnement !', { align: 'center' });

      doc.end();
      return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
      });
    }

    // ------------------------------------------------------------
    // A4 DESIGN – Sobre, professionnel, conteneurs encadrés
    // ------------------------------------------------------------

    const pageContentWidth = doc.page.width - margin * 2;

    // Helper: dessine un cadre (sans remplissage)
    const drawBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      lineWidth: number = 1,
    ) => {
      doc.save();
      doc.lineWidth(lineWidth).strokeColor('#000000').rect(x, y, w, h).stroke();
      doc.restore();
    };

    // Helper: ligne horizontale
    const hr = (y: number, lineWidth: number = 1) => {
      doc
        .moveTo(margin, y)
        .lineTo(margin + pageContentWidth, y)
        .lineWidth(lineWidth)
        .strokeColor('#000000')
        .stroke();
    };

    // ----- EN-TÊTE -----
    const headerY = doc.y;
    const logoSize = 55;

    if (owner && owner.image) {
      try {
        const logoBuffer = Buffer.from(owner.image);
        doc.image(logoBuffer, doc.x, headerY, {
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize],
        });
      } catch (e) {}
    }

    if (owner) {
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(owner.name || 'VOTRE BOUTIQUE', { align: 'right' });
      if (owner.description)
        doc
          .fontSize(9)
          .font('Helvetica-Oblique')
          .fillColor('#444444')
          .text(owner.description, { align: 'right' })
          .fillColor('#000000');
      if (owner.address)
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(owner.address, { align: 'right' });
      const reg: string[] = [];
      if (owner.RC) reg.push(`RC: ${owner.RC}`);
      if (owner.NIS) reg.push(`NIS: ${owner.NIS}`);
      if (owner.NIF) reg.push(`NIF: ${owner.NIF}`);
      if (reg.length)
        doc
          .fontSize(8)
          .fillColor('#555555')
          .text(reg.join('   |   '), { align: 'right' })
          .fillColor('#000000');
      const contacts: string[] = [];
      if (owner.phone) contacts.push(`Tél: ${owner.phone}`);
      if (owner.email) contacts.push(`E-mail: ${owner.email}`);
      if (contacts.length)
        doc.fontSize(9).text(contacts.join('   |   '), { align: 'right' });
    }

    doc.y = Math.max(doc.y, headerY + logoSize) + 12;
    hr(doc.y, 1.5);
    doc.moveDown(0.8);

    // ----- TITRE & MÉTADONNÉES -----
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('BON DE COMMANDE', { align: 'center' });
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`N° ${purchase.id}`, { align: 'center' })
      .fillColor('#000000');
    doc.moveDown(0.7);

    // Ligne méta: Date / Paiement à gauche, infos fiscales à droite
    const metaY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', margin, metaY);
    doc.text('Mode de Paiement', margin, metaY + 14);
    doc.font('Helvetica');
    doc.text(
      purchase.date ? new Date(purchase.date).toLocaleString('fr-FR') : 'N/D',
      margin + 100,
      metaY,
    );
    doc.text(purchase.payment_method || 'N/D', margin + 100, metaY + 14);

    let rightMetaY = metaY;
    doc.font('Helvetica-Bold').fontSize(9);

    doc.y = Math.max(metaY + 14 * 2, rightMetaY) + 12;

    // ----- ENCADRÉ FOURNISSEUR -----
    if (purchase.supplier) {
      const cardX = margin;
      const cardY = doc.y;
      const cardW = pageContentWidth;
      const cardH = 70;

      drawBox(cardX, cardY, cardW, cardH);
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#555555')
        .text('FOURNISSEUR', cardX + 12, cardY + 10)
        .fillColor('#000000');
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(purchase.supplier.name || '', cardX + 12, cardY + 26);
      doc.font('Helvetica').fontSize(9);
      if (purchase.supplier.address)
        doc.text(purchase.supplier.address, cardX + 12, cardY + 42);
      doc.text(
        `Tél: ${purchase.supplier.phone || ''}${purchase.supplier.email ? `   |   E-mail: ${purchase.supplier.email}` : ''}`,
        cardX + 12,
        cardY + 56,
      );

      doc.y = cardY + cardH + 18;
    }

    // ----- TABLEAU DES ARTICLES -----
    const startX = margin;
    const tableTop = doc.y;
    const colWidths = [pageContentWidth - 230, 70, 80, 80];
    const colPos = [
      startX,
      startX + colWidths[0],
      startX + colWidths[0] + colWidths[1],
      startX + colWidths[0] + colWidths[1] + colWidths[2],
    ];

    // En-tête du tableau
    const headerH = 26;
    drawBox(startX, tableTop, pageContentWidth, headerH, 1.5);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('ARTICLE', colPos[0] + 10, tableTop + 9);
    doc.text('QTÉ', colPos[1] + 10, tableTop + 9, {
      width: colWidths[1] - 10,
      align: 'center',
    });
    doc.text('PRIX UNITAIRE', colPos[2] + 5, tableTop + 9, {
      width: colWidths[2] - 10,
      align: 'right',
    });
    doc.text('TOTAL', colPos[3] + 5, tableTop + 9, {
      width: colWidths[3] - 15,
      align: 'right',
    });

    // Séparateurs verticaux des colonnes dans l'en-tête
    for (let i = 1; i < colPos.length; i++) {
      doc
        .moveTo(colPos[i], tableTop)
        .lineTo(colPos[i], tableTop + headerH)
        .lineWidth(1)
        .strokeColor('#000000')
        .stroke();
    }

    let currentRowY = tableTop + headerH;
    const rowBoundaries: number[] = [tableTop];

    for (const item of purchase.purchasedItems || []) {
      const variant = item?.batch?.variant;
      const productName = `${variant.product.name} - ${variant.name ?? ''}`;
      const variantAttrs: string[] = [];
      if (variant?.size) variantAttrs.push(`Taille: ${variant.size}`);
      if (variant?.color) variantAttrs.push(`Couleur: ${variant.color}`);
      if (variant?.weight) variantAttrs.push(`Poids: ${variant.weight}`);
      if (variant?.height) variantAttrs.push(`Hauteur: ${variant.height}`);
      if (variant?.flavor) variantAttrs.push(`Saveur: ${variant.flavor}`);
      const variantText = variantAttrs.length ? variantAttrs.join('  ·  ') : '';

      const batchDetails: string[] = [];
      if (item?.batch?.nLot) batchDetails.push(`Lot: ${item.batch.nLot}`);
      if (item?.batch?.expirationDate)
        batchDetails.push(
          `Exp: ${new Date(item.batch.expirationDate).toLocaleDateString('fr-FR')}`,
        );
      const batchText = batchDetails.length ? batchDetails.join('  ·  ') : '';

      const subLines = [variantText, batchText].filter((l) => l.length > 0);
      const rowHeight = 24 + subLines.length * 11;

      drawBox(startX, currentRowY, pageContentWidth, rowHeight);
      for (let i = 1; i < colPos.length; i++) {
        doc
          .moveTo(colPos[i], currentRowY)
          .lineTo(colPos[i], currentRowY + rowHeight)
          .lineWidth(0.5)
          .strokeColor('#bbbbbb')
          .stroke();
      }

      let yOff = currentRowY + 8;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
      doc.text(productName, colPos[0] + 10, yOff, {
        width: colWidths[0] - 15,
      });
      yOff += 13;

      doc.font('Helvetica').fontSize(8).fillColor('#555555');
      for (const line of subLines) {
        doc.text(line, colPos[0] + 10, yOff, { width: colWidths[0] - 15 });
        yOff += 11;
      }
      doc.fillColor('#000000');

      const unitLabel =
        item.unit === 'package' ? `lot(${item.qtePerUnit ?? 0})` : 'u';
      const quantityText = `${item.quantity ?? 0} ${unitLabel}`;
      const unitPrice = item.sellingPrice ?? 0;
      const lineTotal = (item.quantity ?? 0) * unitPrice;

      doc.font('Helvetica').fontSize(9);
      doc.text(quantityText, colPos[1] + 10, currentRowY + 8, {
        width: colWidths[1] - 10,
        align: 'center',
      });
      doc.text(formatCurrency(unitPrice), colPos[2] + 5, currentRowY + 8, {
        width: colWidths[2] - 10,
        align: 'right',
      });
      doc
        .font('Helvetica-Bold')
        .text(formatCurrency(lineTotal), colPos[3] + 5, currentRowY + 8, {
          width: colWidths[3] - 15,
          align: 'right',
        });

      rowBoundaries.push(currentRowY + rowHeight);
      currentRowY += rowHeight;
    }

    doc.y = currentRowY + 18;

    // ----- ENCADRÉ DES TOTAUX (aligné à droite) -----
    const subtotal =
      (purchase.total ?? 0) -
      (purchase.timbre ?? 0) +
      (purchase.remiseAmount ?? 0);
    const dueAmount = (purchase.total ?? 0) - (purchase.paid ?? 0);

    const totalsWidth = 230;
    const lineH = 20;
    let totalsLineCount = 2; // sous-total + total (toujours affichés)
    if (purchase.remise) totalsLineCount++;
    if (purchase.timbre) totalsLineCount++;
    totalsLineCount += 2; // payé + dû
    const totalsHeight = totalsLineCount * lineH + 16;
    const totalsX = margin + pageContentWidth - totalsWidth;
    const totalsY = doc.y;

    drawBox(totalsX, totalsY, totalsWidth, totalsHeight, 1.5);

    let yOff = totalsY + 12;
    const totalsLabelW = 110;
    const totalsValueX = totalsX + 15 + totalsLabelW;
    const totalsValueW = totalsWidth - 30 - totalsLabelW;

    doc.font('Helvetica').fontSize(9);
    doc.text('Sous-total', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(subtotal), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });
    yOff += lineH;

    if (purchase.remise) {
      doc.text('Remise', totalsX + 15, yOff, { width: totalsLabelW });
      doc.text(
        `-${formatCurrency(purchase.remiseAmount ?? 0)}`,
        totalsValueX,
        yOff,
        { width: totalsValueW, align: 'right' },
      );
      yOff += lineH;
    }
    if (purchase.timbre) {
      doc.text('Timbre Fiscal', totalsX + 15, yOff, { width: totalsLabelW });
      doc.text(`+${formatCurrency(purchase.timbre)}`, totalsValueX, yOff, {
        width: totalsValueW,
        align: 'right',
      });
      yOff += lineH;
    }

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(purchase.total ?? 0), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });
    yOff += lineH + 2;

    doc.font('Helvetica').fontSize(9);
    doc.text('Payé', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(purchase.paid ?? 0), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });
    yOff += lineH;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Dû au Fournisseur', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(dueAmount), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });

    doc.y = totalsY + totalsHeight + 30;

    // ----- PIED DE PAGE -----
    hr(doc.y, 1);
    doc.moveDown(0.6);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Merci pour votre approvisionnement !', { align: 'center' });
    doc.moveDown(0.4);

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }
  async clearAll() {
    await this.stockPaymentRepository.clear();
    await this.datasource.manager.save(Log, {
      action: Actions.DELETE,
      entityType: Types.STOCK_PAYMENT,
      timestamp: new Date().toISOString(),
    });
  }
}
