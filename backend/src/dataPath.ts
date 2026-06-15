import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Returns the path to StockData.sqlite.
 *
 * DEFAULT (Production/Safe Mode):
 * Windows → %APPDATA%\StockManager\StockData.sqlite
 * * ONLY during local development (plain `nest start` with NODE_ENV=development):
 * → <project root>/StockData.sqlite
 */
export function getDatabasePath(): string {
  // Check if we are explicitly in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Development: keep the database next to the project root for easy viewing
    return path.join(process.cwd(), 'StockData.sqlite');
  }

  // PRODUCTION FALLBACK (Safe Default): Always write to user's writable AppData directory
  const appDataDir = getAppDataDir();
  const dbDir = path.join(appDataDir, 'Nexus-data');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'StockData.sqlite');
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
