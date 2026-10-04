export type ReportRange = { from: string; to: string };
export type ReportPreset = 'today' | 'week' | 'month' | '30days';

export function reportPreset(preset: ReportPreset, now = new Date()): ReportRange {
  const to = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (preset === 'today') return { from: to, to };
  if (preset === 'month') return { from: `${to.slice(0, 7)}-01`, to };
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (preset === '30days' ? 29 : 6));
  return { from: start.toISOString().slice(0, 10), to };
}

export function reportRangeError({ from, to }: ReportRange): string | null {
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (!Number.isFinite(days) || days < 0) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
  if (days >= 366) return 'Vui lòng chọn khoảng thời gian tối đa 366 ngày.';
  return null;
}

export function formatReportDate(value: string) {
  return value.split('-').reverse().join('/');
}
