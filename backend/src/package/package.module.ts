import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './entities/package.entity';

@Module({
  controllers: [PackageController],
  providers: [PackageService],
  imports: [TypeOrmModule.forFeature([Package])],
})
export class PackageModule {}
