import {
  Controller,
  Get,
  Post,
  Res,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import express from 'express';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { getDatabasePath } from 'src/dataPath';
import * as path from 'path';
import * as os from 'os';

@Controller('backup')
export class BackupController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /* ── GET /backup/export ─────────────────────────────────────────────── */
  @Get('export')
  async exportDatabase() {
    const dbPath = getDatabasePath();

    // Create a temporary backup file on the operating system
    const tempBackupPath = path.join(
      os.tmpdir(),
      `StockData-backup-${Date.now()}.sqlite`,
    );

    if (!fs.existsSync(dbPath)) {
      throw new HttpException(
        `Database file not found at: ${dbPath}`,
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      // 1. Flush active WAL logs to the database file
      await this.dataSource.query('PRAGMA wal_checkpoint(TRUNCATE)');

      // 2. Safely snapshot the database to a temporary location
      await this.dataSource.query(
        `VACUUM INTO '${tempBackupPath.replace(/\\/g, '\\\\')}'`,
      );

      // 3. Return the absolute path of the backup file to Electron
      return {
        success: true,
        backupFilePath: tempBackupPath,
      };
    } catch (error) {
      console.error('Export failed:', error);
      throw new HttpException(
        `Backup failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /* ── POST /backup/import ────────────────────────────────────────────── */
  // Note: do NOT import MulterModule in BackupModule — FileInterceptor
  // registers multer inline and that is all that is needed.
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importDatabase(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        'No file received. Ensure the FormData key is exactly "file".',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!file.originalname.endsWith('.sqlite')) {
      throw new HttpException(
        'Invalid file type — only .sqlite files are accepted.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dbPath = getDatabasePath();
    const backupPath = dbPath.replace(
      '.sqlite',
      `.backup-${Date.now()}.sqlite`,
    );

    // Safety backup before overwriting
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    try {
      await this.dataSource.destroy();
      fs.writeFileSync(dbPath, file.buffer);
      await this.dataSource.initialize();

      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);

      return { status: 1, response: 'Database imported successfully' };
    } catch (error) {
      // Roll back to the safety backup
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
        await this.dataSource.initialize().catch(() => {});
      }
      throw new HttpException(
        `Import failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
