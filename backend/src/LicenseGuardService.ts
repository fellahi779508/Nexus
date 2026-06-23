// license-guard.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as si from 'systeminformation';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LicenseGuardService implements OnModuleInit {
  async onModuleInit() {
    try {
      // 1. Try checking the current working directory first (Works for Local Dev)
      let licensePath = path.join(process.cwd(), 'license.dat');

      // 2. If not found, escape the deep Electron production folders (Go up 3 levels)
      if (!fs.existsSync(licensePath)) {
        licensePath = path.join(__dirname, '..', '..', 'license.dat');
      }

      // Log the path for debugging visibility in your Electron/Nest logs
      console.log(`Checking license at: ${licensePath}`);

      if (!fs.existsSync(licensePath)) {
        throw new Error(
          `License file missing at resolved path: ${licensePath}`,
        );
      }

      const fileContent = fs.readFileSync(licensePath, 'utf8').trim();
      const [usbSerial, registeredUUID] = fileContent.split(':');

      const boardData = await si.baseboard();
      const currentUUID = boardData.serial;

      if (registeredUUID !== currentUUID) {
        throw new Error('Hardware mismatch.');
      }

      console.log('Hardware verification passed. Booting POS system...');
    } catch (error) {
      console.error('PIRACY DETECTED OR CORRUPT LICENSE:', error.message);
      // Forcefully kill the Electron/Nest process immediately
      // process.exit(99);
    }
  }
}
