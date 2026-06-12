import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { BatchService } from 'src/batch/batch.service';

@Injectable()
export class StartUpService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartUpService.name);

  constructor(
    @Inject(BatchService) private readonly batchService: BatchService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Updating batch statuses...');

    try {
      await this.batchService.verifyExpiry();

      this.logger.log('Batch statuses updated successfully');
    } catch (error) {
      this.logger.error('Failed to update batch statuses', error?.stack);
    }
  }
}
