import { DataSource } from 'typeorm';
import { getDatabasePath } from './dataPath';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: getDatabasePath(),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
