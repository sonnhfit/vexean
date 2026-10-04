import type { DailyReport, ReportTrend } from '../services/reportsApi';

export function reportTrends(report: DailyReport): ReportTrend[] {
  if (report.analytics) return report.analytics.charts;
  const rows = [...report.days].sort((a, b) => a.day.localeCompare(b.day));
  const step = Math.max(1, Math.ceil(rows.length / 31));
  return ([['revenue', 'Xu hướng doanh thu'], ['ticket_count', 'Lượng vé theo thời gian'],
    ['call_count', 'Lưu lượng cuộc gọi']] as const).map(([key, label]) => {
    const groups = [];
    for (let i = 0; i < rows.length; i += step) {
      const slice = rows.slice(i, i + step);
      groups.push({ start: slice[0].day, end: slice[slice.length - 1].day,
        value: slice.reduce((total, row) => total + Number(row[key]), 0) });
    }
    return { key, label, groups, step, currency: key === 'revenue', empty: groups.every(group => group.value === 0) };
  });
}

export function reportValue(value: number | string, currency = false) {
  return `${Math.round(Number(value)).toLocaleString('vi-VN')}${currency ? ' đ' : ''}`;
}

export function chartMaximum(chart: ReportTrend) {
  return Math.max(1, ...chart.groups.flatMap(group => [Number(group.value), Number(group.previous || 0)]));
}
