import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { Credit } from 'src/credit/entities/credit.entity';
import { Log } from 'src/logs/entities/log.entity';
import { StockService } from 'src/stock/stock.service';
import { Client } from 'src/client/entities/client.entity';
import { Actions, Reasons, Types } from 'src/utils/actions';
import { Stock } from 'src/stock/entities/stock.entity';
import { Batch } from 'src/batch/entities/batch.entity';
import { SoldItem } from 'src/sold-item/entities/sold-item.entity';
import { BatchService } from 'src/batch/batch.service';
import { Owner } from 'src/owner/entities/owner.entity';

import PDFDocument from 'pdfkit';

@Injectable()
export class SaleService {
  constructor(
    @InjectRepository(Sale) private saleRepository: Repository<Sale>,
    private readonly datasource: DataSource,
    private readonly stockService: StockService,
    private readonly batchService: BatchService,
  ) {}
  async create(createSaleDto: CreateSaleDto) {
    return this.datasource.transaction(async (manager) => {
      const bacthRepo = manager.getRepository(Batch);
      const stockRepo = manager.getRepository(Stock);
      const saleRepo = manager.getRepository(Sale);
      const clientRepo = manager.getRepository(Client);
      const creditRepo = manager.getRepository(Credit);
      const logRepo = manager.getRepository(Log);
      const soldItemRepo = manager.getRepository(SoldItem);
      let client: any;
      const sale = saleRepo.create(createSaleDto);
      if (createSaleDto.clientId) {
        client = await clientRepo.findOne({
          where: { id: createSaleDto.clientId },
        });
        if (!client) throw new NotFoundException('Client not found');
        sale.client = client;
      }
      const savedSale = await saleRepo.save(sale);
      for (const item of createSaleDto.soldItems) {
        const batch = await bacthRepo.findOne({
          where: { id: item.batchId },
          relations: ['stock', 'variant'],
        });
        if (!batch) throw new NotFoundException('Batch not found');
        const soldItem = soldItemRepo.create({
          quantity: item.quantity,
          unit: item.unit,
          qtePerUnit: item.qtePerUnit,
          total: item.quantity * batch.variant.sellingPriceTTC,
          batch,
          sale: { id: savedSale.id },
          sellingPrice: item.sellingPrice,
        });
        await soldItemRepo.save(soldItem);
        const stock = await this.stockService.findOne(batch.stock.id);
        let totalQte = 0;
        if (item.unit === 'package') {
          totalQte = item.quantity * item.qtePerUnit;
          stock.quantity -= totalQte;
        } else {
          stock.quantity -= item.quantity;
        }
        await stockRepo.save(stock);
        const stockLog = logRepo.create({
          entityType: Types.STOCK,
          action: Actions.REMOVE,
          reason: Reasons.SOLD,
          quantity: totalQte,
          stock: stock,
          sale: { id: savedSale.id },
          timestamp: new Date().toISOString(),
        });
        await logRepo.save(stockLog);
        await this.batchService.updateBatchStatus(batch.id);
      }
      if (createSaleDto.total !== createSaleDto.paid) {
        const credit = creditRepo.create({
          amount: createSaleDto.total - createSaleDto.paid,
          sale: { id: savedSale.id },
          date: new Date().toISOString(),
        });
        client.creditTTC += credit.amount;
        await clientRepo.save(client);
        await creditRepo.save(credit);
        const creditLog = logRepo.create({
          action: Actions.NEW_CREDIT,
          credit: credit,
          entityType: Types.CREDIT,
          sale: { id: savedSale.id },
          timestamp: new Date().toISOString(),
        });
        const clientLog = logRepo.create({
          action: Actions.NEW_CREDIT,
          client,
          entityType: Types.CLIENT,
          sale: { id: savedSale.id },
          timestamp: new Date().toISOString(),
        });
        await logRepo.save(creditLog);
        await logRepo.save(clientLog);
      }
      const saleLog = logRepo.create({
        action: Actions.NEW_SALE,
        sale: { id: savedSale.id },
        entityType: Types.SALE,
        timestamp: new Date().toISOString(),
      });

      await logRepo.save(saleLog);
      return savedSale;
    });
  }

  async findAll(page: number, limit: number, search?: string) {
    if (search) {
      const [items, total] = await this.saleRepository.findAndCount({
        where: { client: { name: ILike(`%${search}%`) } },
        take: limit,
        skip: (page - 1) * limit,
        relations: ['client', 'soldItems', 'soldItems.batch', 'credit'],
        order: { date: 'DESC' },
      });
      return {
        data: items,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const [items, total] = await this.saleRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['client', 'soldItems', 'soldItems.batch', 'credit'],
      order: { date: 'DESC' },
    });
    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
  async getTodaysSales() {
    const sales = await this.saleRepository.find({
      where: {
        date: ILike(`%${new Date().toISOString().split('T')[0]}%`),
        isDetailed: false,
      },
      relations: [
        'client',
        'soldItems',
        'soldItems.batch',
        'soldItems.batch.variant',
        'credit',
      ],
      order: { id: 'DESC' },
    });

    return sales;
  }
  async getTodaysDetailedSales() {
    const sales = await this.saleRepository.find({
      where: {
        date: ILike(`%${new Date().toISOString().split('T')[0]}%`),
        isDetailed: true,
      },
      relations: [
        'client',
        'soldItems',
        'soldItems.batch',
        'soldItems.batch.variant',
        'credit',
      ],
      order: { id: 'DESC' },
    });

    return sales;
  }

  async findOne(id: number) {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: [
        'client',
        'soldItems',
        'soldItems.batch',
        'credit',
        'soldItems.batch.variant',
      ],
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async update(id: number, dto: UpdateSaleDto) {
    return await this.datasource.transaction(async (manager) => {
      const saleRepo = manager.getRepository(Sale);
      const stockRepo = manager.getRepository(Stock);
      const soldItemRepo = manager.getRepository(SoldItem);
      const creditRepo = manager.getRepository(Credit);
      const logRepo = manager.getRepository(Log);
      const clientRepo = manager.getRepository(Client);

      // 1. Fetch the sale
      const sale = await saleRepo.findOne({
        where: { id },
        relations: ['soldItems', 'soldItems.batch', 'client', 'credit'],
      });
      if (!sale) throw new NotFoundException('Sale not found');

      // 2. Return previous quantities back to stock ATOMICALLY
      for (const item of sale.soldItems) {
        await stockRepo.increment(
          { batch: { id: item.batch.id } },
          'quantity',
          item.unit === 'package'
            ? item.qtePerUnit * item.quantity
            : item.quantity,
        );
      }

      // 3. Delete old items & Deduct old Credit Safely
      await soldItemRepo.delete({ sale: { id: sale.id } });

      if (sale.client) {
        const oldClient = await clientRepo.findOne({
          where: { id: sale.client.id },
        });

        // BULLETPROOF FIX: Calculate old credit directly from the sale totals
        // This ignores the relation entirely and guarantees a real number.
        const oldCreditAmount = Number(sale.total) - Number(sale.paid);

        if (oldClient && oldCreditAmount > 0) {
          oldClient.creditTTC = Number(oldClient.creditTTC) - oldCreditAmount;
          await clientRepo.save(oldClient);
        }

        // Wipe the old credit records
        await creditRepo.delete({ sale: { id: sale.id } });
      }

      // 4. Update basic sale properties (Cast to Numbers)
      sale.paid = Number(dto.paid ?? sale.paid);
      sale.total = Number(dto.total ?? sale.total);
      sale.remise = dto.remise ?? sale.remise;
      sale.remiseAmount = dto.remiseAmount ?? sale.remiseAmount;
      sale.date = dto.date ?? sale.date;
      sale.timbre = dto.timbre ?? sale.timbre;

      // Determine which client ID we should be using
      // If dto.clientId is provided, use it. Otherwise, keep the existing one.
      const targetClientId =
        dto.clientId !== undefined ? dto.clientId : sale.client?.id;

      // 5. Handle Client & Credit Assignment safely
      if (targetClientId) {
        const client = await clientRepo.findOne({
          where: { id: targetClientId },
        });
        if (!client) throw new NotFoundException('Client not found');

        sale.client = client;

        // Calculate credit based on the verified sale properties, NOT the dto directly
        const creditAmount = sale.total - sale.paid;

        if (creditAmount > 0) {
          await creditRepo.save(
            creditRepo.create({
              sale: { id: sale.id },
              amount: creditAmount,
            }),
          );

          // Force Number casting to prevent string concatenation ("100" + 50 = "10050")
          client.creditTTC = Number(client.creditTTC) + creditAmount;
          await clientRepo.save(client);
        }
      } else {
        sale.client = null as any;
        // Credit was already deleted in Step 3, so no need to delete again
      }

      // Save basic Sale info inside the transaction
      const savedSale = await saleRepo.save(sale);

      // 6. Bulk Insert new sold items & Deduct Stock Atomically
      if (dto.soldItems && dto.soldItems.length > 0) {
        const soldItemsToCreate = dto.soldItems.map((item) =>
          soldItemRepo.create({
            sale: { id: savedSale.id },
            batch: { id: item.batchId },
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            total: item.sellingPrice * item.quantity,
            qtePerUnit: item.qtePerUnit,
            unit: item.unit,
          }),
        );

        await soldItemRepo.save(soldItemsToCreate);

        for (const item of dto.soldItems) {
          await stockRepo.decrement(
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
          entityType: Types.SALE,
          sale: savedSale,
          timestamp: new Date().toISOString(),
        }),
      );

      return savedSale;
    });
  }
  async remove(id: number) {
    const sale = await this.findOne(id);
    await this.datasource.manager.save(Log, {
      action: Actions.DELETE,
      entityType: Types.SALE,
      timestamp: new Date().toISOString(),
    });

    return this.saleRepository.remove(sale);
  }

  /**
   * Generate PDF buffer for a sale.
   * @param id - Sale ID
   * @param paperType - 'A4' or 'ticket'
   */
  async printSale(id: number, paperType: string): Promise<Buffer> {
    const sale = await this.findOne(id);
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
    // TICKET DESIGN – Plain text, no frills, like a cash register
    // ------------------------------------------------------------
    if (isTicket) {
      // ----- SIMPLE TICKET DESIGN (single column, no overlapping) -----

      // Shop header
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

      // Invoice title
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`INVOICE #${sale.id}`, { align: 'center' });
      doc.moveDown(0.3);

      // Date & payment
      doc.font('Helvetica').fontSize(8);
      doc.text(
        `Date: ${sale.date ? new Date(sale.date).toLocaleString() : 'N/A'}`,
        { align: 'center' },
      );
      doc.text(`Payment: ${sale.payment_methode || 'N/A'}`, {
        align: 'center',
      });
      if (sale.timbre)
        doc.text(`Timbre: ${formatCurrency(sale.timbre)}`, { align: 'center' });
      if (sale.remise)
        doc.text(`Discount: -${formatCurrency(sale.remiseAmount ?? 0)}`, {
          align: 'center',
        });
      doc.moveDown(0.3);
      doc.text('--------------------------------', { align: 'center' });
      doc.moveDown(0.2);

      // Client
      if (sale.client) {
        doc.font('Helvetica-Bold').text('CLIENT:', { align: 'center' });
        doc.font('Helvetica').text(sale.client.name || '', { align: 'center' });
        if (sale.client.address)
          doc.text(sale.client.address, { align: 'center' });
        doc.text(`Tel: ${sale.client.phone || ''}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.text('--------------------------------', { align: 'center' });
        doc.moveDown(0.2);
      }

      // Items: one line per item, no columns
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('ITEMS:', { align: 'center' });
      doc.font('Helvetica').fontSize(8);

      for (const item of sale.soldItems || []) {
        const productName = item?.batch?.variant?.name ?? 'Unknown Product';
        const quantity = item.quantity ?? 0;
        const unit =
          item.unit === 'package' ? `pack (${item.qtePerUnit ?? 0} pcs)` : 'pc';
        const sellingPrice = item.sellingPrice ?? 0;
        const lineTotal = quantity * sellingPrice;

        doc.text(`${productName}`, { align: 'left' });
        doc.text(
          `  ${quantity} ${unit} x ${formatCurrency(sellingPrice)} = ${formatCurrency(lineTotal)}`,
          { align: 'left' },
        );
        doc.moveDown(0.2);
      }

      doc.text('--------------------------------', { align: 'center' });

      // Totals (stacked, right-aligned)
      const subtotal =
        (sale.total ?? 0) +
        (sale.remise ? (sale.remiseAmount ?? 0) : 0) -
        (sale.timbre ?? 0);
      const dueAmount = (sale.total ?? 0) - (sale.paid ?? 0);

      doc.font('Helvetica-Bold');
      doc.text(`Subtotal: ${formatCurrency(subtotal)}`, { align: 'right' });
      if (sale.remise)
        doc.text(`Discount: -${formatCurrency(sale.remiseAmount ?? 0)}`, {
          align: 'right',
        });
      if (sale.timbre)
        doc.text(`Timbre: +${formatCurrency(sale.timbre)}`, { align: 'right' });
      doc.text(`TOTAL: ${formatCurrency(sale.total ?? 0)}`, { align: 'right' });
      doc.text(`Paid: ${formatCurrency(sale.paid ?? 0)}`, { align: 'right' });
      doc.text(`Due: ${formatCurrency(dueAmount)}`, { align: 'right' });

      doc.moveDown(0.5);
      doc
        .font('Helvetica-Oblique')
        .fontSize(7)
        .text('Thank you!', { align: 'center' });

      doc.end();
      return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
      });
    }

    // ------------------------------------------------------------
    // A4 DESIGN – Full rambo: colors, boxes, icons, professional
    // ------------------------------------------------------------

    // Helper: draw rounded rectangle
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

    // Helper: draw box with background
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

    let currentY = doc.y;

    // ----- HEADER with logo and shop details -----
    const headerY = doc.y;
    // Logo on left (if exists)
    if (owner && owner.image) {
      try {
        const logoBuffer = Buffer.from(owner.image);
        doc.image(logoBuffer, doc.x, headerY, { width: 60, height: 60 });
      } catch (e) {}
    }
    // Shop info on right
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

    // ----- INVOICE TITLE & METADATA (two columns) -----
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('INVOICE', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text(`#${sale.id}`, { align: 'center' });
    doc.moveDown(0.5);

    // date, payment, timbre, discount
    const metaX = doc.x;
    doc.fontSize(10);
    doc.text(
      `Date: ${sale.date ? new Date(sale.date).toLocaleString() : 'N/A'}`,
      metaX,
      doc.y,
    );
    doc.text(`Payment: ${sale.payment_methode || 'N/A'}`, { align: 'right' });
    doc.moveDown(0.3);
    if (sale.timbre)
      doc.text(`Timbre fiscal: ${formatCurrency(sale.timbre)}`, metaX);
    if (sale.remise)
      doc.text(`Discount: ${formatCurrency(sale.remiseAmount ?? 0)}`, {
        align: 'right',
      });
    doc.moveDown(0.5);

    // ----- CLIENT CARD -----
    if (sale.client) {
      const cardX = doc.x;
      const cardY = doc.y;
      drawBox(cardX, cardY, doc.page.width - 80, 65, '#ffffff', '#ffffff');
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Bill To:', cardX + 10, cardY + 8);
      doc.font('Helvetica').fontSize(9);
      doc.text(sale.client.name || '', cardX + 10, cardY + 25);
      if (sale.client.address)
        doc.text(sale.client.address, cardX + 10, cardY + 40);
      doc.text(
        `Tel: ${sale.client.phone || ''}   Email: ${sale.client.email || ''}`,
        cardX + 10,
        cardY + 55,
      );
      doc.moveDown(2);
    }

    // ----- ITEMS TABLE (modern, striped) -----
    const startX = doc.x;
    const tableTop = doc.y;
    const colWidths = [220, 80, 100, 100];
    const colPos = [
      startX,
      startX + colWidths[0],
      startX + colWidths[0] + colWidths[1],
      startX + colWidths[0] + colWidths[1] + colWidths[2],
    ];

    // Table header
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

    for (const item of sale.soldItems || []) {
      const variant = item?.batch?.variant;
      const productName = variant?.name ?? 'Unknown Product';
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

      const displayText = productName + variantText + batchText;
      const lines = displayText.split('\n');
      const rowHeight = 12 + (lines.length - 1) * 10 + 8;

      // Alternate row background
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
      const sellingPrice = item.sellingPrice ?? 0;
      const lineTotal = (item.quantity ?? 0) * sellingPrice;

      doc.text(quantityText, colPos[1] + 10, currentRowY + 8, {
        width: 60,
        align: 'center',
      });
      doc.text(formatCurrency(sellingPrice), colPos[2] + 10, currentRowY + 8, {
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

    // ----- TOTALS IN A BOX (right) -----
    const subtotal =
      (sale.total ?? 0) +
      (sale.remise ? (sale.remiseAmount ?? 0) : 0) -
      (sale.timbre ?? 0);
    const dueAmount = (sale.total ?? 0) - (sale.paid ?? 0);
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
    if (sale.remise) {
      doc.text(
        `Discount: -${formatCurrency(sale.remiseAmount ?? 0)}`,
        totalsX + 15,
        yOff,
        { align: 'right' },
      );
      yOff += 18;
    }
    if (sale.timbre) {
      doc.text(`Timbre: +${formatCurrency(sale.timbre)}`, totalsX + 15, yOff, {
        align: 'right',
      });
      yOff += 18;
    }
    doc
      .font('Helvetica-Bold')
      .text(`Total: ${formatCurrency(sale.total ?? 0)}`, totalsX + 15, yOff, {
        align: 'right',
      });
    yOff += 20;
    doc
      .font('Helvetica')
      .text(`Paid: ${formatCurrency(sale.paid ?? 0)}`, totalsX + 15, yOff, {
        align: 'right',
      });
    yOff += 20;
    doc
      .font('Helvetica-Bold')
      .fillColor(dueAmount > 0 ? '#dc2626' : '#16a34a')
      .text(`Due: ${formatCurrency(dueAmount)}`, totalsX + 15, yOff, {
        align: 'right',
      })
      .fillColor('black');

    doc.y = totalsY + totalsHeight + 15;

    // ----- FOOTER (with terms) -----
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text('Thank you for your business!', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .text('Payment due within 30 days. Returns accepted within 7 days.', {
        align: 'center',
      });
    doc.text('This is a computer-generated invoice – no signature required.', {
      align: 'center',
    });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  async cleareAll() {
    await this.saleRepository.clear();
    await this.datasource.manager.save(Log, {
      action: Actions.DELETE,
      entityType: Types.SALE,
      timestamp: new Date().toISOString(),
    });
  }
}
