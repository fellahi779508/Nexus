import { Module } from '@nestjs/common';
import { ZakatService } from './zakat.service';
import { ZakatController } from './zakat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zakat } from './entities/zakat.entity';

@Module({
  controllers: [ZakatController],
  providers: [ZakatService],
  imports: [TypeOrmModule.forFeature([Zakat])],
})
export class ZakatModule {}
