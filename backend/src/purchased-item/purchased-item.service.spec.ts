import { Test, TestingModule } from '@nestjs/testing';
import { PurchasedItemService } from './purchased-item.service';

describe('PurchasedItemService', () => {
  let service: PurchasedItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchasedItemService],
    }).compile();

    service = module.get<PurchasedItemService>(PurchasedItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
