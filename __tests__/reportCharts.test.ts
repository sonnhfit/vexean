import { chartMaximum, reportTrends } from '../src/utils/reportCharts';
import { reportPreset } from '../src/utils/reportDates';
import type { DailyReport } from '../src/services/reportsApi';

const totals = { revenue: '100', ticket_count: 1, call_count: 2, inbound: 1, outbound: 1 };
function report(count: number): DailyReport {
  const days = Array.from({ length: count }, (_, i) => ({ ...totals, day: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10) })).reverse();
  return { date_from: days[days.length - 1].day, date_to: days[0].day, timezone: 'Asia/Ho_Chi_Minh', totals, days };
}

test('fallback charts group all days in chronological order without dropping totals', () => {
  const data = report(366);
  const charts = reportTrends(data);
  expect(charts).toHaveLength(3);
  expect(charts[0].groups.length).toBeLessThanOrEqual(31);
  expect(charts[0].groups[0].start).toBe(data.date_from);
  expect(charts[0].groups.at(-1)?.end).toBe(data.date_to);
  expect(charts[0].groups.reduce((sum, group) => sum + Number(group.value), 0)).toBe(36600);
  expect(charts[1].groups.reduce((sum, group) => sum + Number(group.value), 0)).toBe(366);
  expect(charts[2].groups.reduce((sum, group) => sum + Number(group.value), 0)).toBe(732);
  expect(charts[0].groups[0].previous).toBeUndefined();
});

test('comparison scale includes prior period and handles all-zero charts', () => {
  const chart = reportTrends(report(1))[0];
  chart.groups[0].previous = '1000';
  expect(chartMaximum(chart)).toBe(1000);
  chart.groups[0].value = 0;
  chart.groups[0].previous = 0;
  expect(chartMaximum(chart)).toBe(1);
});

test('30 day filter crosses month boundaries and includes today', () => {
  expect(reportPreset('30days', new Date('2026-03-01T17:00:00Z'))).toEqual({ from: '2026-02-01', to: '2026-03-02' });
});
