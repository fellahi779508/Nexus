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
      if (createSaleDto.printType) {
        await this.printSale(savedSale.id, createSaleDto.printType);
      }
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
        'soldItems.batch.variant.product',
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

        const oldCreditAmount = Number(sale.total) - Number(sale.paid);

        if (oldClient && oldCreditAmount > 0) {
          oldClient.creditTTC = Number(oldClient.creditTTC) - oldCreditAmount;
          await clientRepo.save(oldClient);
        }
      }

      // FIX 1: Move this outside the block so lingering credit links
      // are ALWAYS wiped cleanly before rebuilding them
      await creditRepo.delete({ sale: { id: sale.id } });

      // 4. Update basic sale properties (Cast to Numbers)
      sale.paid = Number(dto.paid ?? sale.paid);
      sale.total = Number(dto.total ?? sale.total);
      sale.remise = dto.remise ?? sale.remise;
      sale.remiseAmount = dto.remiseAmount ?? sale.remiseAmount;
      sale.date = dto.date ?? sale.date;
      sale.timbre = dto.timbre ?? sale.timbre;

      // 5. Handle Client & Credit Assignment safely
      if (dto.clientId) {
        const client = await clientRepo.findOne({
          where: { id: dto.clientId },
        });
        if (!client) throw new NotFoundException('Client not found');

        sale.client = client;

        const creditAmount = sale.total - sale.paid;

        if (creditAmount > 0) {
          const newCredit = creditRepo.create({
            sale: { id: sale.id },
            amount: creditAmount,
          });

          const savedCredit = await manager.save(newCredit);

          // FIX 2: Bind the new credit back to the sale entity instance
          // to stop TypeORM from overwriting it with NULL in the next line!
          sale.credit = savedCredit;

          client.creditTTC = Number(client.creditTTC) + creditAmount;
          await clientRepo.save(client);
        } else {
          sale.credit = null as any;
        }
      } else {
        sale.client = null as any;
        sale.credit = null as any;
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

      // Titre de la facture
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`FACTURE N°${sale.id}`, { align: 'center' });
      doc.moveDown(0.3);

      // Date et mode de paiement
      doc.font('Helvetica').fontSize(8);
      doc.text(
        `Date: ${sale.date ? new Date(sale.date).toLocaleString('fr-FR') : 'N/D'}`,
        { align: 'center' },
      );
      doc.text(`Paiement: ${sale.payment_methode || 'N/D'}`, {
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

      // Client
      if (sale.client) {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text('CLIENT', { align: 'center' });
        doc.font('Helvetica').fontSize(8);
        doc.text(sale.client.name || '', { align: 'center' });
        if (sale.client.address)
          doc.text(sale.client.address, { align: 'center' });
        doc.text(`Tél: ${sale.client.phone || ''}`, { align: 'center' });
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

      for (const item of sale.soldItems || []) {
        const variant = item?.batch?.variant;
        const productName = `${variant.product.name} - ${variant.name ?? ''}`;
        const quantity = item.quantity ?? 0;
        const unit =
          item.unit === 'package' ? `lot (${item.qtePerUnit ?? 0} u)` : 'u';
        const sellingPrice = item.sellingPrice ?? 0;
        const lineTotal = quantity * sellingPrice;

        doc.font('Helvetica-Bold').text(`${productName}`, { align: 'left' });
        doc
          .font('Helvetica')
          .text(`  ${quantity} ${unit} x ${formatCurrency(sellingPrice)}`, {
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
        (sale.total ?? 0) - (sale.timbre ?? 0) + (sale.remiseAmount ?? 0);
      const dueAmount = (sale.total ?? 0) - (sale.paid ?? 0);

      doc.font('Helvetica').fontSize(8);
      doc.text(`Sous-total: ${formatCurrency(subtotal)}`, { align: 'right' });
      if (sale.remise)
        doc.text(`Remise: -${formatCurrency(sale.remiseAmount ?? 0)}`, {
          align: 'right',
        });
      if (sale.timbre)
        doc.text(`Timbre Fiscal: +${formatCurrency(sale.timbre)}`, {
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
        .text(`TOTAL: ${formatCurrency(sale.total ?? 0)}`, { align: 'right' });
      doc.font('Helvetica').fontSize(8);
      doc.text(`Payé: ${formatCurrency(sale.paid ?? 0)}`, { align: 'right' });
      doc
        .font('Helvetica-Bold')
        .text(`Reste à Payer: ${formatCurrency(dueAmount)}`, {
          align: 'right',
        });

      doc.moveDown(0.6);
      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text('Merci pour votre achat !', { align: 'center' });

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

    // ----- TITRE & MÉTADONNÉES DE LA FACTURE -----
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('FACTURE', { align: 'center' });
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`N° ${sale.id}`, { align: 'center' })
      .fillColor('#000000');
    doc.moveDown(0.7);

    // Ligne méta: Date / Paiement à gauche, infos fiscales à droite
    const metaY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', margin, metaY);
    doc.text('Mode de Paiement', margin, metaY + 14);
    doc.font('Helvetica');
    doc.text(
      sale.date ? new Date(sale.date).toLocaleString('fr-FR') : 'N/D',
      margin + 100,
      metaY,
    );
    doc.text(sale.payment_methode || 'N/D', margin + 100, metaY + 14);

    let rightMetaY = metaY;
    doc.font('Helvetica-Bold').fontSize(9);

    doc.y = Math.max(metaY + 14 * 2, rightMetaY) + 12;

    // ----- ENCADRÉ CLIENT -----
    if (sale.client) {
      const cardX = margin;
      const cardY = doc.y;
      const cardW = pageContentWidth;
      const cardH = 70;

      drawBox(cardX, cardY, cardW, cardH);
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#555555')
        .text('FACTURÉ À', cardX + 12, cardY + 10)
        .fillColor('#000000');
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(sale.client.name || '', cardX + 12, cardY + 26);
      doc.font('Helvetica').fontSize(9);
      if (sale.client.address)
        doc.text(sale.client.address, cardX + 12, cardY + 42);
      doc.text(
        `Tél: ${sale.client.phone || ''}${sale.client.email ? `   |   E-mail: ${sale.client.email}` : ''}`,
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

    for (const item of sale.soldItems || []) {
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
      const sellingPrice = item.sellingPrice ?? 0;
      const lineTotal = (item.quantity ?? 0) * sellingPrice;

      doc.font('Helvetica').fontSize(9);
      doc.text(quantityText, colPos[1] + 10, currentRowY + 8, {
        width: colWidths[1] - 10,
        align: 'center',
      });
      doc.text(formatCurrency(sellingPrice), colPos[2] + 5, currentRowY + 8, {
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
      (sale.total ?? 0) - (sale.timbre ?? 0) + (sale.remiseAmount ?? 0);
    const dueAmount = (sale.total ?? 0) - (sale.paid ?? 0);

    const totalsWidth = 230;
    const lineH = 20;
    let totalsLineCount = 2; // sous-total + total (toujours affichés)
    if (sale.remise) totalsLineCount++;
    if (sale.timbre) totalsLineCount++;
    totalsLineCount += 2; // payé + reste à payer
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

    if (sale.remise) {
      doc.text('Remise', totalsX + 15, yOff, { width: totalsLabelW });
      doc.text(
        `-${formatCurrency(sale.remiseAmount ?? 0)}`,
        totalsValueX,
        yOff,
        { width: totalsValueW, align: 'right' },
      );
      yOff += lineH;
    }
    if (sale.timbre) {
      doc.text('Timbre Fiscal', totalsX + 15, yOff, { width: totalsLabelW });
      doc.text(`+${formatCurrency(sale.timbre)}`, totalsValueX, yOff, {
        width: totalsValueW,
        align: 'right',
      });
      yOff += lineH;
    }

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(sale.total ?? 0), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });
    yOff += lineH + 2;

    doc.font('Helvetica').fontSize(9);
    doc.text('Payé', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(sale.paid ?? 0), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });
    yOff += lineH;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Reste à Payer', totalsX + 15, yOff, { width: totalsLabelW });
    doc.text(formatCurrency(dueAmount), totalsValueX, yOff, {
      width: totalsValueW,
      align: 'right',
    });

    doc.y = totalsY + totalsHeight + 30;

    // ----- PIED DE PAGE -----
    doc.moveDown(0.6);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Merci pour votre confiance !', { align: 'center' });
    doc.moveDown(0.4);

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
