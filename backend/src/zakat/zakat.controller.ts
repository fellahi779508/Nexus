import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';

import { ZakatService } from './zakat.service';
import { CreateZakatDto, UpdateZakatDto } from './dto/create-zakat.dto';

@Controller('zakat')
export class ZakatController {
  constructor(private readonly zakatService: ZakatService) {}

  // ─── Summary (must be before :id) ─────────────────────────────────────────

  /**
   * GET /zakat/summary
   * Returns the full Zakat summary for the UI — re-runs verification internally.
   */
  @Get('summary')
  getSummary() {
    return this.zakatService.getSummary();
  }

  // ─── Verify ───────────────────────────────────────────────────────────────

  /**
   * GET /zakat/verify
   * Manually triggers a Zakat verification and returns the result.
   * Also runs automatically on application bootstrap.
   */
  @Get('verify')
  verifyZakat() {
    return this.zakatService.verifyZakat();
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  /**
   * GET /zakat/inventory
   * Returns the current total inventory value (stock × sellPrice).
   */
  @Get('inventory')
  getInventoryValue(@Query('type') type: string) {
    return this.zakatService
      .getInventoryValue(type)
      .then((value) => ({ inventoryValue: value }));
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * POST /zakat
   * Creates the initial Zakat configuration.
   * Body: { nisab: number, startDate: string, label?: string, rate?: number }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return this.zakatService.create(body);
  }

  /**
   * GET /zakat
   * Returns all Zakat configurations (typically just one).
   */
  @Get()
  findAll() {
    return this.zakatService.findAll();
  }

  /**
   * GET /zakat/:id
   * Returns a single Zakat configuration by ID.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zakatService.findOne(id);
  }

  /**
   * PATCH /zakat/:id
   * Updates the Zakat configuration.
   * Changing nisab or startDate resets the satisfaction state for a fresh cycle.
   * Body: { nisab?: number, startDate?: string, label?: string, rate?: number }
   */
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.zakatService.update(id, body);
  }

  /**
   * DELETE /zakat/:id
   * Removes the Zakat configuration.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.zakatService.remove(id);
  }
}
