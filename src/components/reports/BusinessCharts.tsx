import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DailyReport, ReportTrend } from '../../services/reportsApi';
import { APP_COLORS as C } from '../../theme/colors';
import { chartMaximum, reportTrends, reportValue } from '../../utils/reportCharts';
import { formatReportDate } from '../../utils/reportDates';

type Topic = 'all' | 'revenue' | 'operations';
const topics: { key: Topic; label: string }[] = [
  { key: 'all', label: 'Tất cả' }, { key: 'revenue', label: 'Doanh thu' }, { key: 'operations', label: 'Vận hành' },
];
const colors = { revenue: C.primaryDark, ticket_count: C.info, call_count: '#8760b8' };
const paymentColors: Record<string, string> = { paid: C.success, pending: C.warning, refunded: '#8760b8', other: C.placeholder };
const shortDate = (value: string) => formatReportDate(value).slice(0, 5);

function TrendChart({ chart, comparison }: { chart: ReportTrend; comparison: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = chart.groups[selectedIndex] || chart.groups[0];
  const maximum = chartMaximum(chart);
  const color = colors[chart.key];
  return <View style={styles.card}>
    <Text style={styles.heading}>{chart.label}</Text>
    <Text style={styles.note}>{chart.step === 1 ? 'Theo ngày' : `Cộng mỗi ${chart.step} ngày; nhóm cuối có thể ngắn hơn`}{chart.currency ? ' · VND' : ''}</Text>
    <View style={styles.legend}>
      <Text style={styles.note}><Text style={{ color }}>■</Text> Kỳ này</Text>
      {comparison && <Text style={styles.note}><Text style={styles.previousText}>■</Text> Kỳ trước</Text>}
    </View>
    <Text style={styles.scale}>Mốc trên: {reportValue(maximum, chart.currency)}</Text>
    {chart.empty && <Text style={styles.note}>Chưa có dữ liệu phát sinh{comparison ? ' trong cả hai kỳ' : ''}.</Text>}
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.plot}>
      {chart.groups.map((point, index) => <Pressable key={point.start}
        accessibilityRole="button" accessibilityState={{ selected: selectedIndex === index }}
        accessibilityLabel={`${formatReportDate(point.start)} đến ${formatReportDate(point.end)}: ${reportValue(point.value, chart.currency)}${comparison ? `; kỳ trước: ${reportValue(point.previous || 0, chart.currency)}` : ''}`}
        onPress={() => setSelectedIndex(index)} style={[styles.column, selectedIndex === index && styles.selectedColumn]}>
        <View style={styles.bars}>
          <View style={[styles.bar, { height: Math.max(0, Number(point.value)) / maximum * 138, backgroundColor: color }]} />
          {comparison && <View style={[styles.bar, styles.previousBar, { height: Math.max(0, Number(point.previous || 0)) / maximum * 138 }]} />}
        </View>
        <Text style={styles.axis}>{shortDate(point.start)}</Text>
      </Pressable>)}
    </ScrollView>
    <Text style={styles.note}>Vuốt ngang và chạm cột để xem chi tiết · Gốc trục: 0</Text>
    {selected && <View style={styles.detail} accessibilityLiveRegion="polite">
      <Text style={styles.detailTitle}>{formatReportDate(selected.start)}{selected.end !== selected.start ? ` – ${formatReportDate(selected.end)}` : ''}</Text>
      <Text style={[styles.value, { color }]}>{reportValue(selected.value, chart.currency)}</Text>
      {comparison && <Text style={styles.note}>Kỳ trước{selected.previous_start ? ` (${shortDate(selected.previous_start)} – ${shortDate(selected.previous_end || selected.previous_start)})` : ''}: {reportValue(selected.previous || 0, chart.currency)}</Text>}
    </View>}
  </View>;
}

export function BusinessCharts({ report }: { report: DailyReport }) {
  const [topic, setTopic] = useState<Topic>('all');
  const trends = useMemo(() => reportTrends(report), [report]);
  const analytics = report.analytics;
  const revenueVisible = topic !== 'operations';
  const operationsVisible = topic !== 'revenue';
  const totalCalls = report.totals.call_count;
  const directions = [
    { label: 'Gọi vào', value: report.totals.inbound, color: C.info },
    { label: 'Gọi ra', value: report.totals.outbound, color: '#8760b8' },
    { label: 'Chưa xác định', value: Math.max(0, totalCalls - report.totals.inbound - report.totals.outbound), color: C.placeholder },
  ];
  return <View>
    <Text style={styles.title}>Phân tích kinh doanh</Text>
    <View style={styles.filters}>{topics.map(item => <Pressable key={item.key} accessibilityRole="button"
      accessibilityState={{ selected: item.key === topic }} onPress={() => setTopic(item.key)}
      style={[styles.filter, item.key === topic && styles.activeFilter]}>
      <Text style={[styles.filterText, item.key === topic && styles.activeFilterText]}>{item.label}</Text>
    </Pressable>)}</View>
    {analytics ? <>
      <Text style={styles.comparison}>So với {formatReportDate(analytics.previous_start)} – {formatReportDate(analytics.previous_end)} (cùng số ngày).</Text>
      <View style={styles.metrics}>{analytics.metrics.filter(metric => topic === 'all' || (topic === 'revenue' ? ['revenue', 'average'].includes(metric.key) : ['ticket_count', 'call_count'].includes(metric.key))).map(metric =>
        <View key={metric.key} style={styles.metric}>
          <Text style={styles.note}>{metric.label}</Text>
          <Text style={styles.metricValue}>{reportValue(metric.value, metric.currency)}</Text>
          <Text style={[styles.change, { color: metric.change.direction === 'up' ? C.success : metric.change.direction === 'down' ? C.danger : C.textSecondary }]}>{metric.change.label}</Text>
          <Text style={styles.note}>Kỳ trước: {reportValue(metric.previous, metric.currency)}</Text>
        </View>)}</View>
      <View style={styles.card}>
        {revenueVisible && <Text style={styles.note}>Ngày doanh thu cao nhất: {analytics.best_day ? `${formatReportDate(analytics.best_day.day)} · ${reportValue(analytics.best_day.revenue, true)}` : 'Chưa có doanh thu'}</Text>}
        <Text style={styles.note}>Tỷ lệ hủy: {analytics.cancellation_rate.toFixed(1)}% ({analytics.cancelled}/{analytics.all_tickets} vé)</Text>
      </View>
    </> : <Text style={styles.comparison}>Phân tích kỳ trước, tuyến và thanh toán tạm thời chưa khả dụng. Bạn vẫn có thể xem xu hướng và lọc theo ngày.</Text>}
    {trends.filter(chart => chart.key === 'revenue' ? revenueVisible : operationsVisible).map(chart =>
      <TrendChart key={`${report.date_from}-${report.date_to}-${chart.key}`} chart={chart} comparison={!!analytics} />)}
    {revenueVisible && analytics && <>
      <View style={styles.card}>
        <Text style={styles.heading}>Top 5 tuyến theo doanh thu</Text>
        <Text style={styles.note}>Vé hợp lệ · Tỷ trọng trong tổng doanh thu</Text>
        {analytics.routes.length === 0 && <Text style={styles.note}>Chưa có vé hợp lệ trong khoảng ngày đã chọn.</Text>}
        {analytics.routes.map((route, index) => <View key={`${index}-${route.label}`} style={styles.rank}>
          <Text style={styles.detailTitle}>{index + 1}. {route.label}</Text>
          <Text style={styles.value}>{reportValue(route.revenue, true)}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, Math.max(0, route.width))}%` }]} /></View>
          <Text style={styles.note}>{route.tickets} vé · {Number(route.share).toFixed(1)}% doanh thu</Text>
        </View>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Cơ cấu thanh toán</Text>
        <Text style={styles.note}>Tỷ trọng theo số vé hợp lệ</Text>
        <View style={styles.stack}>{analytics.payments.map(payment => <View key={payment.key} style={{ width: `${payment.share}%`, backgroundColor: paymentColors[payment.key] || C.placeholder }} />)}</View>
        {analytics.payments.map(payment => <View key={payment.key} style={styles.payment}>
          <Text style={styles.detailTitle}><Text style={{ color: paymentColors[payment.key] || C.placeholder }}>● </Text>{payment.label} · {payment.share.toFixed(1)}%</Text>
          <Text style={styles.note}>{payment.tickets} vé · {reportValue(payment.revenue, true)}</Text>
        </View>)}
        <Text style={styles.note}>Giá trị theo giá vé và trạng thái thanh toán hiện tại, chưa trừ giảm giá; không phải tiền thực thu theo ngày.</Text>
      </View>
    </>}
    {operationsVisible && <View style={styles.card}>
      <Text style={styles.heading}>Cơ cấu cuộc gọi</Text>
      <Text style={styles.note}>{totalCalls} cuộc gọi trong khoảng ngày đã chọn</Text>
      <View style={styles.stack}>{directions.map(item => <View key={item.label} style={{ width: `${totalCalls ? item.value / totalCalls * 100 : 0}%`, backgroundColor: item.color }} />)}</View>
      {directions.map(item => <Text key={item.label} style={styles.note}><Text style={{ color: item.color }}>● </Text>{item.label}: {item.value} ({totalCalls ? (item.value / totalCalls * 100).toFixed(1) : '0'}%)</Text>)}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 21, fontWeight: '700', color: C.textPrimary, marginTop: 22, marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filter: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: C.surface },
  activeFilter: { backgroundColor: C.primaryDark },
  filterText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  activeFilterText: { color: C.surface },
  comparison: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 14 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 14, gap: 8 },
  heading: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  note: { fontSize: 12, color: C.textSecondary, lineHeight: 19 },
  legend: { flexDirection: 'row', gap: 18 },
  previousText: { color: '#a6b3c3' },
  scale: { fontSize: 11, color: C.textSecondary, marginTop: 5 },
  plot: { paddingBottom: 8, paddingTop: 8, minWidth: '100%' },
  column: { width: 51, paddingHorizontal: 5, borderRadius: 6 },
  selectedColumn: { backgroundColor: C.primaryLight },
  bars: { height: 150, flexDirection: 'row', gap: 4, alignItems: 'flex-end', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: C.border },
  bar: { width: 13, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  previousBar: { backgroundColor: '#a6b3c3' },
  axis: { fontSize: 10, textAlign: 'center', marginTop: 6, color: C.textSecondary },
  detail: { backgroundColor: C.background, borderRadius: 10, padding: 12, gap: 5 },
  detailTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  value: { fontSize: 18, fontWeight: '700', color: C.primaryDark },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metric: { width: '48%', padding: 12, backgroundColor: C.primaryLight, borderRadius: 12, gap: 7 },
  metricValue: { fontSize: 19, fontWeight: '700', color: C.primaryDark },
  change: { fontSize: 12, fontWeight: '700' },
  rank: { gap: 7, marginTop: 12 },
  track: { height: 10, backgroundColor: C.primaryLight, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.primaryDark, borderRadius: 5 },
  stack: { height: 24, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: C.background, marginVertical: 8 },
  payment: { paddingVertical: 7, gap: 5 },
});
