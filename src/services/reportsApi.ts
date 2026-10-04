import { requestJson } from './apiClient';

export type ReportTotals = {
  revenue: string;
  ticket_count: number;
  call_count: number;
  inbound: number;
  outbound: number;
};
export type TrendGroup = {
  start: string; end: string;
  previous_start?: string; previous_end?: string;
  value: number | string; previous?: number | string;
};
export type ReportTrend = {
  key: 'revenue' | 'ticket_count' | 'call_count';
  label: string; currency: boolean; step: number; empty: boolean;
  groups: TrendGroup[];
};
export type ReportAnalytics = {
  previous_start: string; previous_end: string;
  metrics: { key: string; label: string; value: number | string; previous: number | string;
    currency: boolean; change: { direction: 'up' | 'down' | 'neutral'; label: string } }[];
  charts: ReportTrend[];
  routes: { label: string; revenue: number | string; tickets: number; width: number; share: number | string }[];
  payments: { key: string; label: string; revenue: number | string; tickets: number; share: number }[];
  cancelled: number; all_tickets: number; cancellation_rate: number;
  best_day: (ReportTotals & { day: string }) | null;
};
export type DailyReport = {
  analytics?: ReportAnalytics;
  date_from: string;
  date_to: string;
  timezone: string;
  totals: ReportTotals;
  days: (ReportTotals & { day: string })[];
};

export function getDailyReport(from: string, to: string) {
  return requestJson<DailyReport>(
    `/api/nhaxe/admin/reports/daily/?include_analytics=1&date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`,
    { auth: true, logLabel: 'admin-daily-report' },
  );
}
