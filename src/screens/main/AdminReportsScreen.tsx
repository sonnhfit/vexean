import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Platform, Pressable,
  RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessCharts } from '../../components/reports/BusinessCharts';
import { DailyReport, getDailyReport } from '../../services/reportsApi';
import { APP_COLORS as C } from '../../theme/colors';
import { formatReportDate, ReportPreset, reportPreset, reportRangeError } from '../../utils/reportDates';

const presets: { key: ReportPreset; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: '7 ngày' },
  { key: '30days', label: '30 ngày' },
  { key: 'month', label: 'Tháng này' },
];
const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} đ`;
const pickerDate = (value: string) => new Date(`${value}T12:00:00`);
const dateValue = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

export function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState(() => reportPreset('month'));
  const [draft, setDraft] = useState(range);
  const [activePreset, setActivePreset] = useState<ReportPreset | null>('month');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const result = await getDailyReport(range.from, range.to);
      if (id === requestId.current) setData(result);
    } catch (reason) {
      if (id === requestId.current) {
        setError(reason instanceof Error ? reason.message : 'Không tải được báo cáo. Vui lòng thử lại.');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [range.from, range.to]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]));

  const choosePreset = (preset: ReportPreset) => {
    const next = reportPreset(preset);
    setActivePreset(preset);
    setDraft(next);
    setRange(next);
    setValidation('');
  };
  const applyRange = () => {
    const message = reportRangeError(draft);
    setValidation(message || '');
    if (!message) {
      setActivePreset(null);
      setRange({ ...draft });
    }
  };
  const openPicker = (field: 'from' | 'to') => {
    setSelectedDate(pickerDate(draft[field]));
    setPicker(field);
  };
  const confirmDate = (value: Date) => {
    if (picker) setDraft(current => ({ ...current, [picker]: dateValue(value) }));
    setPicker(null);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={data?.days || []}
        keyExtractor={item => item.day}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primaryDark} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Doanh thu & cuộc gọi</Text>
            <Text style={styles.note}>Theo ngày khởi hành · Giờ Việt Nam</Text>
            <View style={styles.presets}>
              {presets.map(item => (
                <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: activePreset === item.key }}
                  onPress={() => choosePreset(item.key)} style={[styles.chip, activePreset === item.key && styles.chipActive]}>
                  <Text style={[styles.chipText, activePreset === item.key && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.card}>
              <View style={styles.dateRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Chọn từ ngày" style={styles.dateField} onPress={() => openPicker('from')}>
                  <Text style={styles.note}>Từ ngày</Text><Text style={styles.dateText}>{formatReportDate(draft.from)}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Chọn đến ngày" style={styles.dateField} onPress={() => openPicker('to')}>
                  <Text style={styles.note}>Đến ngày</Text><Text style={styles.dateText}>{formatReportDate(draft.to)}</Text>
                </Pressable>
              </View>
              {!!validation && <Text accessibilityRole="alert" style={styles.error}>{validation}</Text>}
              <Pressable accessibilityRole="button" style={styles.button} onPress={applyRange}><Text style={styles.buttonText}>Xem báo cáo</Text></Pressable>
            </View>
            <Text style={styles.period}>{formatReportDate(range.from)} – {formatReportDate(range.to)}</Text>
            {loading && <ActivityIndicator style={styles.spinner} color={C.primaryDark} />}
            {!!error && <View style={styles.card}>
              <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
              <Pressable accessibilityRole="button" style={styles.button} onPress={load}><Text style={styles.buttonText}>Thử lại</Text></Pressable>
            </View>}
            {data && <>
              <View style={[styles.card, styles.revenueCard]}>
                <Text style={styles.note}>Tổng doanh thu vé</Text>
                <Text style={styles.revenue}>{money(data.totals.revenue)}</Text>
                <Text style={styles.note}>{data.totals.ticket_count} vé hợp lệ</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.note}>Tổng cuộc gọi</Text>
                <Text style={styles.callTotal}>{data.totals.call_count}</Text>
                <Text style={styles.note}>Gọi vào: {data.totals.inbound} · Gọi ra: {data.totals.outbound}</Text>
              </View>
              <Text style={styles.note}>Doanh thu là tổng giá vé, gồm vé chưa thanh toán và không gồm vé hủy. Cuộc gọi thiếu thời gian gọi được tính theo thời gian ghi nhận.</Text>
              {data.totals.ticket_count === 0 && data.totals.call_count === 0 && <Text style={styles.empty}>Chưa có vé hoặc cuộc gọi trong khoảng thời gian này.</Text>}
              <BusinessCharts report={data} />
              <Text style={styles.sectionTitle}>Chi tiết từng ngày</Text>
            </>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.dailyHeader}><Text style={styles.dateText}>{formatReportDate(item.day)}</Text><Text style={styles.dailyRevenue}>{money(item.revenue)}</Text></View>
            <Text style={styles.note}>{item.ticket_count} vé · {item.call_count} cuộc gọi</Text>
            <Text style={styles.note}>Gọi vào: {item.inbound} · Gọi ra: {item.outbound}</Text>
          </View>
        )}
      />
      {picker && Platform.OS === 'android' && <DateTimePicker value={selectedDate} mode="date" onChange={(event, value) => {
        if (event.type === 'set' && value) confirmDate(value);
        else setPicker(null);
      }} />}
      {Platform.OS === 'ios' && <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.overlay}><View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.dailyHeader}>
            <Pressable accessibilityRole="button" onPress={() => setPicker(null)}><Text style={styles.pickerAction}>Hủy</Text></Pressable>
            <Text style={styles.dateText}>{picker === 'from' ? 'Từ ngày' : 'Đến ngày'}</Text>
            <Pressable accessibilityRole="button" onPress={() => confirmDate(selectedDate)}><Text style={styles.pickerAction}>Xong</Text></Pressable>
          </View>
          <DateTimePicker value={selectedDate} mode="date" display="spinner" locale="vi-VN" themeVariant="light" onChange={(_, value) => { if (value) setSelectedDate(value); }} />
        </View></View>
      </Modal>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  note: { fontSize: 13, lineHeight: 20, color: C.textSecondary },
  presets: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  chipText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  chipTextActive: { color: C.surface },
  card: { padding: 16, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 12, gap: 6 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1, paddingVertical: 8 },
  dateText: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  button: { padding: 13, alignItems: 'center', backgroundColor: C.primaryDark, borderRadius: 10, marginTop: 8 },
  buttonText: { color: C.surface, fontWeight: '700', fontSize: 15 },
  period: { color: C.textSecondary, fontSize: 14, marginBottom: 12 },
  revenueCard: { backgroundColor: C.primaryLight },
  revenue: { fontSize: 30, fontWeight: '800', color: C.primaryDark },
  callTotal: { fontSize: 30, fontWeight: '800', color: C.info },
  sectionTitle: { marginTop: 20, marginBottom: 12, fontSize: 18, fontWeight: '700', color: C.textPrimary },
  dailyHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dailyRevenue: { fontSize: 16, fontWeight: '700', color: C.primaryDark },
  error: { color: C.danger, lineHeight: 21 },
  empty: { color: C.textSecondary, paddingVertical: 16, textAlign: 'center' },
  spinner: { padding: 24 },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  pickerAction: { color: C.primaryDark, fontSize: 16, fontWeight: '600', padding: 12 },
});
