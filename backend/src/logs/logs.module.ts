import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entities/log.entity';

@Module({
  controllers: [LogsController],
  providers: [LogsService],
  imports: [TypeOrmModule.forFeature([Log])],
})
export class LogsModule {}
