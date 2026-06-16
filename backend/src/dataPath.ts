import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Returns the path to StockData.sqlite.
 */
export function getDatabasePath(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development: Keep the database inside your backend project root for easy access
    return path.join(process.cwd(), 'StockData.sqlite');
  }

  // PRODUCTION FALLBACK: Use path handed down from Electron, otherwise fall back to manual lookup
  const appDataDir = process.env.ELECTRON_USER_DATA ?? getAppDataDir();
  const dbDir = path.join(appDataDir, 'Nexus-data');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'StockData.sqlite');
}

/**
 * Manual fallback function if the backend runs independently of Electron
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
