import { passengerPaymentSummary } from '../src/utils/passengerPayments';

test('counts passengers separately from cargo and distinguishes paid from pending', () => {
  expect(passengerPaymentSummary([
    { kind: 'ticket', payment_method: 'cash', payment_status: 'paid', amount: '100000' },
    { kind: 'ticket', payment_method: 'cash', payment_status: 'pending', amount: '200000' },
    { kind: 'ticket', payment_method: 'transfer', payment_status: 'completed', amount: '150000' },
    { kind: 'ticket', payment_method: 'cash', payment_status: 'refunded', amount: '50000' },
    { kind: 'cargo', payment_method: 'cash', payment_status: 'paid', amount: '100000' },
    { kind: 'ticket', payment_status: 'pending', amount: '200000' },
  ])).toEqual(['Tiền mặt: 2 khách · 300.000 đ (đã thu: 1 khách)', 'Chuyển khoản: 1 khách · 150.000 đ (đã thu: 1 khách)']);
});

test('shows zero counts for an empty trip', () => {
  expect(passengerPaymentSummary([])).toEqual([
    'Tiền mặt: 0 khách · 0 đ (đã thu: 0 khách)', 'Chuyển khoản: 0 khách · 0 đ (đã thu: 0 khách)',
  ]);
});
