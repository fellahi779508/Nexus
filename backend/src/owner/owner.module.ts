import { Module } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { OwnerController } from './owner.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Owner } from './entities/owner.entity';

@Module({
  controllers: [OwnerController],
  providers: [OwnerService],
  imports: [TypeOrmModule.forFeature([Owner])],
})
export class OwnerModule {}
