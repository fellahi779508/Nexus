import { Test, TestingModule } from '@nestjs/testing';
import { PurchasedItemController } from './purchased-item.controller';
import { PurchasedItemService } from './purchased-item.service';

describe('PurchasedItemController', () => {
  let controller: PurchasedItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchasedItemController],
      providers: [PurchasedItemService],
    }).compile();

    controller = module.get<PurchasedItemController>(PurchasedItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
