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
  async exportDatabase(@Res() res: express.Response) {
    const dbPath = getDatabasePath();
    const tempBackupPath = path.join(
      os.tmpdir(),
      `backup-${Date.now()}.sqlite`,
    );

    if (!fs.existsSync(dbPath)) {
      throw new HttpException('Database file not found', HttpStatus.NOT_FOUND);
    }

    try {
      // 1. Force a WAL checkpoint to sync all lingering transactions to disk
      await this.dataSource.query('PRAGMA wal_checkpoint(TRUNCATE)');

      // 2. 🛡️ Use SQLite's native VACUUM INTO to create an unlocked snapshot file safely
      // This bypasses Windows file locking entirely!
      await this.dataSource.query(
        `VACUUM INTO '${tempBackupPath.replace(/\\/g, '\\\\')}'`,
      );

      const filename = `StockData-backup-${Date.now()}.sqlite`;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      // 3. Stream the temporary backup file to the user
      const readStream = fs.createReadStream(tempBackupPath);

      readStream.on('error', (streamErr) => {
        console.error('Streaming error:', streamErr);
        if (!res.headersSent) {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .send('Error streaming backup file');
        }
      });

      // 4. Once streaming finishes, clean up the temporary file from the PC
      res.on('finish', () => {
        try {
          if (fs.existsSync(tempBackupPath)) {
            fs.unlinkSync(tempBackupPath);
            console.log('✅ Temporary backup file cleaned up.');
          }
        } catch (cleanupErr) {
          console.error('Failed to delete temporary backup file:', cleanupErr);
        }
      });

      readStream.pipe(res);
    } catch (error) {
      console.error('Database export routine failed:', error);

      // Safety cleanup if vacuum succeeded but streaming crashed early
      if (fs.existsSync(tempBackupPath)) {
        try {
          fs.unlinkSync(tempBackupPath);
        } catch {}
      }

      throw new HttpException(
        `Backup creation failed: ${error.message}`,
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
