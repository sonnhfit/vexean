type PaymentLine = {
  kind: string;
  amount?: string;
  payment_method?: string;
  payment_status: string;
};

export function passengerPaymentSummary(lines: PaymentLine[]) {
  return (['cash', 'transfer'] as const).map(method => {
    const tickets = lines.filter(line => line.kind === 'ticket' &&
      line.payment_method === method && line.payment_status !== 'refunded');
    const paid = tickets.filter(line => ['paid', 'completed'].includes(line.payment_status)).length;
    const total = tickets.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    return `${method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}: ${tickets.length} khách · ${total.toLocaleString('vi-VN')} đ (đã thu: ${paid} khách)`;
  });
}
