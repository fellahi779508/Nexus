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
  async findAll(page: number, limit: number, search: string) {
    if (search) {
      const [items, count] = await this.stockPaymentRepository.findAndCount({
        where: { supplier: { name: `${ILike(search)}` } },
        take: limit,
        skip: (page - 1) * limit,
        relations: [
          'supplier',
          'credit',
          'purchasedItems',
          'purchasedItems.batch',
        ],
      });

      return {
        data: items,
        meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
      };
    }
    const [items, count] = await this.stockPaymentRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: [
        'supplier',
        'credit',
        'purchasedItems',
        'purchasedItems.batch',
      ],
    });
    return {
      data: items,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
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
      const supplierRepo = manager.getRepository(Supplier); // Added Supplier Repo

      // 1. Fetch the purchase normally, including the supplier relation
      const stockPayment = await stockPaymentRepo.findOne({
        where: { id },
        relations: ['purchasedItems', 'purchasedItems.batch', 'supplier'],
      });
      if (!stockPayment) throw new NotFoundException('Stock payment not found');

      // 2. Return previous quantities back to stock ATOMICALLY
      // Note: Reverting a purchase means DECREMENTING stock
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

        // BULLETPROOF FIX: Calculate old credit directly from the payment totals
        const oldCreditAmount =
          Number(stockPayment.total) - Number(stockPayment.paid);

        if (oldSupplier && oldCreditAmount > 0) {
          oldSupplier.creditTTC =
            Number(oldSupplier.creditTTC) - oldCreditAmount;
          await supplierRepo.save(oldSupplier);
        }

        // Wipe the old credit records
        await creditRepo.delete({ stockPayment: { id: stockPayment.id } });
      }

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
          await creditRepo.save(
            creditRepo.create({
              stockPayment: { id: stockPayment.id },
              amount: creditAmount,
            }),
          );

          // Force Number casting to prevent string concatenation errors
          supplier.creditTTC = Number(supplier.creditTTC) + creditAmount;
          await supplierRepo.save(supplier);
        }
      } else {
        stockPayment.supplier = null as any;
        // Credit was already deleted in Step 3, so no need to delete again
      }

      // Save basic Purchase info inside the transaction
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

        // Bulk save new items in 1 trip
        await purchasedItemRepo.save(purchasedItemsToCreate);

        // Bulk add stock atomically directly in the DB engine
        // Note: Applying a new purchase means INCREMENTING stock
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
    if (stockPayment.credit) {
      stockPayment.supplier.creditTTC -= stockPayment.credit.amount;
      await this.datasource.manager.save(stockPayment.supplier);
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

    // ----- TICKET DESIGN (simple, no columns) -----
    if (isTicket) {
      // Shop header (owner as buyer)
      if (owner) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(owner.name || 'YOUR SHOP', { align: 'center' });
        if (owner.address)
          doc
            .font('Helvetica')
            .fontSize(8)
            .text(owner.address, { align: 'center' });
        if (owner.phone)
          doc
            .font('Helvetica')
            .fontSize(8)
            .text(`Tel: ${owner.phone}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.text('================================', { align: 'center' });
        doc.moveDown(0.3);
      }

      // Title
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`PURCHASE ORDER #${purchase.id}`, { align: 'center' });
      doc.moveDown(0.3);

      // Date & payment
      doc.font('Helvetica').fontSize(8);
      doc.text(
        `Date: ${purchase.date ? new Date(purchase.date).toLocaleString() : 'N/A'}`,
        { align: 'center' },
      );
      doc.text(`Payment: ${purchase.payment_method || 'N/A'}`, {
        align: 'center',
      });
      if (purchase.timbre)
        doc.text(`Timbre: ${formatCurrency(purchase.timbre)}`, {
          align: 'center',
        });
      if (purchase.remise)
        doc.text(`Discount: -${formatCurrency(purchase.remiseAmount ?? 0)}`, {
          align: 'center',
        });
      doc.moveDown(0.3);
      doc.text('--------------------------------', { align: 'center' });
      doc.moveDown(0.2);

      // Supplier (seller)
      if (purchase.supplier) {
        doc.font('Helvetica-Bold').text('SUPPLIER:', { align: 'center' });
        doc
          .font('Helvetica')
          .text(purchase.supplier.name || '', { align: 'center' });
        if (purchase.supplier.address)
          doc.text(purchase.supplier.address, { align: 'center' });
        doc.text(`Tel: ${purchase.supplier.phone || ''}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.text('--------------------------------', { align: 'center' });
        doc.moveDown(0.2);
      }

      // Items
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('ITEMS:', { align: 'center' });
      doc.font('Helvetica').fontSize(8);
      for (const item of purchase.purchasedItems || []) {
        const variantName = item?.batch?.variant?.name ?? '';
        const fullName = variantName;

        const quantity = item.quantity ?? 0;
        const unit =
          item.unit === 'package' ? `pack (${item.qtePerUnit ?? 0} pcs)` : 'pc';
        const unitPrice = item.sellingPrice ?? 0;
        const lineTotal = quantity * unitPrice;
        doc.text(`${fullName}`, { align: 'left' });
        doc.text(
          `  ${quantity} ${unit} x ${formatCurrency(unitPrice)} = ${formatCurrency(lineTotal)}`,
          { align: 'left' },
        );
        doc.moveDown(0.2);
      }

      doc.text('--------------------------------', { align: 'center' });

      // Totals
      const subtotal =
        (purchase.total ?? 0) +
        (purchase.remise ? (purchase.remiseAmount ?? 0) : 0) -
        (purchase.timbre ?? 0);
      const dueAmount = (purchase.total ?? 0) - (purchase.paid ?? 0);
      doc.font('Helvetica-Bold');
      doc.text(`Subtotal: ${formatCurrency(subtotal)}`, { align: 'right' });
      if (purchase.remise)
        doc.text(`Discount: -${formatCurrency(purchase.remiseAmount ?? 0)}`, {
          align: 'right',
        });
      if (purchase.timbre)
        doc.text(`Timbre: +${formatCurrency(purchase.timbre)}`, {
          align: 'right',
        });
      doc.text(`TOTAL: ${formatCurrency(purchase.total ?? 0)}`, {
        align: 'right',
      });
      doc.text(`Paid: ${formatCurrency(purchase.paid ?? 0)}`, {
        align: 'right',
      });
      doc.text(`Due to supplier: ${formatCurrency(dueAmount)}`, {
        align: 'right',
      });

      doc.moveDown(0.5);
      doc
        .font('Helvetica-Oblique')
        .fontSize(7)
        .text('Thank you for your supply!', { align: 'center' });
      doc.end();
      return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
      });
    }

    // ----- A4 PROFESSIONAL DESIGN (mirroring sale print) -----
    const roundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string,
      stroke: string,
    ) => {
      doc.save();
      doc.rect(x, y, w, h).fill(fill).stroke(stroke);
      doc.restore();
    };
    const drawBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      bg: string = '#f9fafb',
      border: string = '#e5e7eb',
    ) => {
      roundedRect(x, y, w, h, 6, bg, border);
    };

    // Header with logo and shop details (owner)
    const headerY = doc.y;
    if (owner && owner.image) {
      try {
        const logoBuffer = Buffer.from(owner.image);
        doc.image(logoBuffer, doc.x, headerY, { width: 60, height: 60 });
      } catch (e) {}
    }
    if (owner) {
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(owner.name || 'YOUR SHOP', { align: 'right' });
      if (owner.description)
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(owner.description, { align: 'right' });
      if (owner.address)
        doc.fontSize(9).text(owner.address, { align: 'right' });
      const reg: string[] = [];
      if (owner.RC) reg.push(`RC: ${owner.RC}`);
      if (owner.NIS) reg.push(`NIS: ${owner.NIS}`);
      if (owner.NIF) reg.push(`NIF: ${owner.NIF}`);
      if (reg.length) doc.fontSize(8).text(reg.join(' | '), { align: 'right' });
      const contacts: string[] = [];
      if (owner.phone) contacts.push(`Tel: ${owner.phone}`);
      if (owner.email) contacts.push(`Email: ${owner.email}`);
      if (contacts.length)
        doc.fontSize(9).text(contacts.join(' | '), { align: 'right' });
    }
    doc.moveDown(1);
    doc.text(
      '-------------------------------------------------------------------------------',
      { align: 'center' },
    );
    doc.moveDown(0.5);

    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PURCHASE ORDER', { align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica')
      .text(`#${purchase.id}`, { align: 'center' });
    doc.moveDown(0.5);

    // Meta info
    doc.fontSize(10);
    doc.text(
      `Date: ${purchase.date ? new Date(purchase.date).toLocaleString() : 'N/A'}`,
      doc.x,
      doc.y,
    );
    doc.text(`Payment: ${purchase.payment_method || 'N/A'}`, {
      align: 'right',
    });
    doc.moveDown(0.3);
    if (purchase.timbre)
      doc.text(`Timbre fiscal: ${formatCurrency(purchase.timbre)}`, doc.x);
    if (purchase.remise)
      doc.text(`Discount: ${formatCurrency(purchase.remiseAmount ?? 0)}`, {
        align: 'right',
      });
    doc.moveDown(0.5);

    // Supplier card
    if (purchase.supplier) {
      const cardX = doc.x;
      const cardY = doc.y;
      drawBox(cardX, cardY, doc.page.width - 80, 65, '#f0fdf4', '#bbf7d0');
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Supplier:', cardX + 10, cardY + 8);
      doc.font('Helvetica').fontSize(9);
      doc.text(purchase.supplier.name || '', cardX + 10, cardY + 25);
      if (purchase.supplier.address)
        doc.text(purchase.supplier.address, cardX + 10, cardY + 40);
      doc.text(
        `Tel: ${purchase.supplier.phone || ''}   Email: ${purchase.supplier.email || ''}`,
        cardX + 10,
        cardY + 55,
      );
      doc.moveDown(2);
    }

    // Items table
    const startX = doc.x;
    const tableTop = doc.y;
    const colWidths = [220, 80, 100, 100];
    const colPos = [
      startX,
      startX + colWidths[0],
      startX + colWidths[0] + colWidths[1],
      startX + colWidths[0] + colWidths[1] + colWidths[2],
    ];
    doc.fontSize(10).font('Helvetica-Bold');
    const headerH = 25;
    drawBox(
      startX,
      tableTop,
      doc.page.width - 80,
      headerH,
      '#1e293b',
      '#0f172a',
    );
    doc.fillColor('white');
    doc.text('Item', colPos[0] + 10, tableTop + 8);
    doc.text('Qty', colPos[1] + 10, tableTop + 8, {
      width: 60,
      align: 'center',
    });
    doc.text('Unit Price', colPos[2] + 10, tableTop + 8, {
      width: 80,
      align: 'right',
    });
    doc.text('Total', colPos[3] + 10, tableTop + 8, {
      width: 70,
      align: 'right',
    });
    doc.fillColor('black');

    let currentRowY = tableTop + headerH;
    let rowIdx = 0;
    for (const item of purchase.purchasedItems || []) {
      const variant = item?.batch?.variant;
      const productName = variant?.name ?? 'Unknown Product';

      const fullName = productName;
      const variantAttrs: string[] = [];
      if (variant?.size) variantAttrs.push(`Size: ${variant.size}`);
      if (variant?.color) variantAttrs.push(`Color: ${variant.color}`);
      if (variant?.weight) variantAttrs.push(`Weight: ${variant.weight}`);
      if (variant?.height) variantAttrs.push(`Height: ${variant.height}`);
      if (variant?.flavor) variantAttrs.push(`Flavor: ${variant.flavor}`);
      const variantText = variantAttrs.length
        ? `\n${variantAttrs.join(', ')}`
        : '';
      const batchDetails: string[] = [];
      if (item?.batch?.nLot) batchDetails.push(`Lot: ${item.batch.nLot}`);
      if (item?.batch?.expirationDate)
        batchDetails.push(
          `Exp: ${new Date(item.batch.expirationDate).toLocaleDateString()}`,
        );
      const batchText = batchDetails.length
        ? `\n${batchDetails.join(', ')}`
        : '';
      const displayText = fullName + variantText + batchText;
      const lines = displayText.split('\n');
      const rowHeight = 12 + (lines.length - 1) * 10 + 8;
      const bgColor = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
      drawBox(
        startX,
        currentRowY,
        doc.page.width - 80,
        rowHeight,
        bgColor,
        '#e2e8f0',
      );
      let yOff = currentRowY + 8;
      doc.font('Helvetica').fontSize(9);
      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], colPos[0] + 10, yOff + i * 12);
      }
      const unitDisplay =
        item.unit === 'package'
          ? `Pack (${item.qtePerUnit ?? 0} pcs)`
          : 'Piece';
      const quantityText = `${item.quantity ?? 0} ${item.unit === 'package' ? 'pack(s)' : 'pc(s)'} x ${unitDisplay}`;
      const unitPrice = item.sellingPrice ?? 0;
      const lineTotal = (item.quantity ?? 0) * unitPrice;
      doc.text(quantityText, colPos[1] + 10, currentRowY + 8, {
        width: 60,
        align: 'center',
      });
      doc.text(formatCurrency(unitPrice), colPos[2] + 10, currentRowY + 8, {
        width: 80,
        align: 'right',
      });
      doc.text(formatCurrency(lineTotal), colPos[3] + 10, currentRowY + 8, {
        width: 70,
        align: 'right',
      });
      currentRowY += rowHeight;
      rowIdx++;
    }
    doc.y = currentRowY + 10;

    // Totals box
    const subtotal =
      (purchase.total ?? 0) +
      (purchase.remise ? (purchase.remiseAmount ?? 0) : 0) -
      (purchase.timbre ?? 0);
    const dueAmount = (purchase.total ?? 0) - (purchase.paid ?? 0);
    const totalsWidth = 220;
    const totalsHeight = 140;
    const totalsX = doc.page.width - margin - totalsWidth;
    const totalsY = doc.y;
    drawBox(totalsX, totalsY, totalsWidth, totalsHeight, '#f0f0f0');
    doc.fontSize(9);
    let yOff = totalsY + 12;
    doc.text(`Subtotal: ${formatCurrency(subtotal)}`, totalsX + 15, yOff, {
      align: 'right',
    });
    yOff += 18;
    if (purchase.remise)
      doc.text(
        `Discount: -${formatCurrency(purchase.remiseAmount ?? 0)}`,
        totalsX + 15,
        yOff,
        { align: 'right' },
      );
    yOff += 18;
    if (purchase.timbre)
      doc.text(
        `Timbre: +${formatCurrency(purchase.timbre)}`,
        totalsX + 15,
        yOff,
        { align: 'right' },
      );
    yOff += 18;
    doc
      .font('Helvetica-Bold')
      .text(
        `Total: ${formatCurrency(purchase.total ?? 0)}`,
        totalsX + 15,
        yOff,
        { align: 'right' },
      );
    yOff += 20;
    doc
      .font('Helvetica')
      .text(`Paid: ${formatCurrency(purchase.paid ?? 0)}`, totalsX + 15, yOff, {
        align: 'right',
      });
    yOff += 20;
    doc
      .font('Helvetica-Bold')
      .fillColor(dueAmount > 0 ? '#dc2626' : '#16a34a')
      .text(
        `Due to supplier: ${formatCurrency(dueAmount)}`,
        totalsX + 15,
        yOff,
        { align: 'right' },
      )
      .fillColor('black');

    doc.y = totalsY + totalsHeight + 15;

    // Footer
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text('Thank you for your supply!', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(8).text('Payment terms: Net 30 days.', { align: 'center' });
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
