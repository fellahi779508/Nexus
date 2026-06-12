import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Returns the path to StockData.sqlite.
 *
 * When packaged as Electron (backend is inside an .asar archive):
 *   Windows → %APPDATA%\StockManager\StockData.sqlite
 *   macOS   → ~/Library/Application Support/StockManager/StockData.sqlite
 *   Linux   → ~/.config/StockManager/StockData.sqlite
 *
 * During development (plain `nest start`):
 *   → <project root>/StockData.sqlite  (original behaviour)
 *
 * The folder is created automatically if it does not exist.
 */
export function getDatabasePath(): string {
  // __dirname is inside app.asar only when running from a packaged Electron app.
  // This is the most reliable signal — no env variables needed.
  const isPackaged = __dirname.includes('app.asar');

  if (isPackaged) {
    const appDataDir = getAppDataDir();
    const dbDir = path.join(appDataDir, 'StockManager');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return path.join(dbDir, 'StockData.sqlite');
  }

  // Development: keep the database next to the project root
  return path.join(process.cwd(), 'StockData.sqlite');
}

/**
 * Returns the OS user-data directory.
 */
function getAppDataDir(): string {
  switch (process.platform) {
    case 'win32':
      return (
        process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
      );
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support');
    default: // linux
      return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
  }
}
