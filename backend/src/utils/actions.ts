export enum Actions {
  CREATE = 'create',
  ADD = 'add',
  REMOVE = 'remove',
  DELETE = 'delete',
  NEW_SALE = 'new sale',
  NEW_CREDIT = 'new credit',
  REMOVE_CREDIT = 'remove credit',
  NEW_PURCHASE = 'new purchase',
  PAYMENT = 'payment',
}
export enum Reasons {
  SOLD = 'sold',
  RETURN = 'returned',
  EXPIRED = 'expired',
  REFILL = 'refilled',
  NEW = 'new',
  PAID = 'paid',
  DAMAGED = 'damaged',
}
export enum Types {
  STOCK = 'stock',
  CREDIT = 'credit',
  SALE = 'sale',
  BATCH = 'batch',
  STOCK_PAYMENT = 'stockPayment',
  CLIENT = 'client',
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
}
