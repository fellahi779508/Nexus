// license-guard.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as si from 'systeminformation';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // Imported for robust cross-platform fallback path matching

@Injectable()
export class LicenseGuardService implements OnModuleInit {
  async onModuleInit() {
    try {
      let licensePath: string;

      // 1. Resolve the system AppData/Roaming path safely
      const roamingPath =
        process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      const targetFolder = path.join(roamingPath, 'Nexus-data');
      const prodLicensePath = path.join(targetFolder, 'license.dat');

      // 2. Check if we are running in local development or production mode
      if (process.env.NODE_ENV !== 'production') {
        // Local Dev: Look inside the project root folder first
        const devLicensePath = path.join(process.cwd(), 'license.dat');

        if (fs.existsSync(devLicensePath)) {
          licensePath = devLicensePath;
        } else {
          licensePath = prodLicensePath; // Fallback to Roaming even in dev if local file isn't there
        }
      } else {
        // Production: Force check inside AppData/Roaming/Nexus-data/license.dat
        licensePath = prodLicensePath;
      }

      // Defensive tracking: Ensure folder container structurally exists
      if (!fs.existsSync(targetFolder) && licensePath === prodLicensePath) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

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
      // Forcefully kill the process with exit code 99 to trigger Electron's lock.html viewport
      process.exit(99);
    }
  }
}
