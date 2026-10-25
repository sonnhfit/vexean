import { APP_COLORS as C } from '../theme/colors';

export function paymentStatusColor(status: string) {
  if (['paid', 'completed'].includes(status)) return C.success;
  if (['pending', 'unpaid', 'not_paid'].includes(status)) return C.warning;
  return C.danger;
}

export function settlementColor(key: string) {
  if (['cash', 'transfer'].includes(key)) return C.success;
  if (key === 'unpaid') return C.warning;
  if (['unknown', 'refunded'].includes(key)) return C.danger;
  return C.textPrimary;
}
