import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePreventRemove } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ApiError, requestJson } from '../../services/apiClient';
import { RootStackParamList } from '../../types/navigation';
import { APP_COLORS as C } from '../../theme/colors';

type Report = {
  id: number;
  name: string;
  route_name: string;
  vehicle_name: string;
  driver_name: string;
  completion_status: 'completed' | null;
  preview_token?: string;
  totals: Record<string, string>;
  lines: {
    kind: string;
    code: string;
    name: string;
    amount: string;
    cod: string;
    payment_method: string;
    payment_status: string;
  }[];
};
const labels: Record<string, string> = {
  ticket_revenue: 'Doanh thu vé',
  cargo_revenue: 'Doanh thu hàng',
  cash: 'Đã thu tiền mặt',
  transfer: 'Đã thu chuyển khoản',
  unpaid: 'Chưa thu',
  unknown: 'Cần kiểm tra / phương thức khác',
  refunded: 'Đã hoàn tiền (trừ doanh thu)',
  cod: 'COD thu hộ (ngoài doanh thu)',
};
const money = (value?: string) =>
  `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const paymentStatus: Record<string, string> = {
  paid: 'Đã thu',
  pending: 'Chưa thu',
  refunded: 'Đã hoàn tiền',
};
const paymentMethod: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  cod: 'Thu hộ COD',
  momo: 'MoMo',
  vnpay: 'VNPay',
};

export function DriverTripCompletionScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'DriverTripCompletion'>) {
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const endpoint = `/api/nhaxe/driver/me/trips/${route.params.tripId}/complete/`;
  const completed = report?.completion_status === 'completed';
  usePreventRemove(saving, () => {
    /* Wait for the close request before leaving. */
  });
  const load = useCallback(async () => {
    setLoading(true);
    setConfirmed(false);
    setError(null);
    setReport(null);
    try {
      setReport(
        await requestJson<Report>(endpoint, { method: 'GET', auth: true }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không tải được báo cáo. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  useEffect(() => {
    load();
  }, [load]);
  const complete = async () => {
    if (!confirmed || !report?.preview_token || submitting.current || completed)
      return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      setReport(
        await requestJson<Report>(endpoint, {
          method: 'POST',
          auth: true,
          body: { preview_token: report.preview_token },
        }),
      );
      setConfirmed(false);
      scroll.current?.scrollTo({ y: 0, animated: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể đóng lệnh. Vui lòng thử lại.',
      );
      if (err instanceof ApiError && err.status === 409) {
        setReport(null);
        setConfirmed(false);
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 20 },
        ]}
      >
        <View style={styles.intro}>
          <Ionicons
            name={
              completed ? 'checkmark-circle-outline' : 'document-text-outline'
            }
            size={32}
            color={C.primaryDark}
          />
          <Text style={styles.title}>
            {completed ? 'Đã kết thúc chuyến' : 'Kiểm tra doanh thu chuyến'}
          </Text>
          <Text style={styles.hint}>
            {completed
              ? 'Báo cáo đã được lưu để đối soát với kế toán.'
              : 'Xem lại số liệu và chi tiết vé / hàng trước khi xác nhận đóng lệnh.'}
          </Text>
        </View>
        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color={C.primaryDark} />
            <Text style={styles.hint}>Đang tải báo cáo doanh thu...</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
        {!loading && !report ? (
          <Pressable style={styles.button} onPress={load}>
            <Text style={styles.buttonText}>Tải lại báo cáo</Text>
          </Pressable>
        ) : null}
        {report && (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>{report.name}</Text>
              <Text style={styles.body}>{report.route_name}</Text>
              <Text style={styles.hint}>
                Xe: {report.vehicle_name || 'Chưa phân xe'} · Tài xế:{' '}
                {report.driver_name || 'Chưa cập nhật'}
              </Text>
            </View>
            <View style={styles.revenue}>
              <Text style={styles.body}>Tổng doanh thu</Text>
              <Text style={styles.amount}>{money(report.totals.revenue)}</Text>
              <Text style={styles.hint}>
                Doanh thu vé sau giảm giá và phí hàng; không gồm đơn hủy, tiền
                hoàn và COD.
              </Text>
            </View>
            <View style={styles.card}>
              {Object.entries(labels).map(([key, label]) => (
                <View style={styles.row} key={key}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue}>
                    {money(report.totals[key])}
                  </Text>
                </View>
              ))}
              <Text style={styles.hint}>
                Tiền mặt đã thu cần đối chiếu người thu trước khi xác định số
                tiền tài xế phải nộp. Chọn phương thức thanh toán chưa có nghĩa
                là đã thu tiền.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.heading}>
                Chi tiết vé / hàng ({report.lines.length})
              </Text>
              {!report.lines.length ? (
                <Text style={styles.hint}>
                  Chuyến không có vé hoặc hàng hợp lệ.
                </Text>
              ) : (
                report.lines.map((line, index) => (
                  <View
                    key={`${line.kind}-${line.code}-${index}`}
                    style={styles.line}
                  >
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>
                        {line.kind === 'ticket' ? 'Vé' : 'Hàng'} · {line.code}
                      </Text>
                      <Text style={styles.rowValue}>{money(line.amount)}</Text>
                    </View>
                    <Text style={styles.body}>
                      {line.name || 'Chưa có tên khách'}
                    </Text>
                    <Text style={styles.hint}>
                      {paymentMethod[line.payment_method] ||
                        'Chưa rõ phương thức'}{' '}
                      ·{' '}
                      {paymentStatus[line.payment_status] ||
                        'Chưa xác định thanh toán'}
                    </Text>
                    {Number(line.cod) > 0 ? (
                      <Text style={styles.hint}>
                        COD thu hộ: {money(line.cod)}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
            {!completed ? (
              <View style={styles.card}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: confirmed, disabled: saving }}
                  disabled={saving}
                  style={styles.confirmRow}
                  onPress={() => setConfirmed(value => !value)}
                >
                  <Ionicons
                    name={confirmed ? 'checkbox' : 'square-outline'}
                    size={26}
                    color={C.primaryDark}
                  />
                  <Text style={styles.rowLabel}>
                    Tôi đã kiểm tra và xác nhận doanh thu của chuyến này.
                  </Text>
                </Pressable>
                <Text style={styles.hint}>
                  Sau khi đóng lệnh, báo cáo được chốt và tài xế không thể chỉnh
                  sửa lịch đón, thanh toán trên chuyến.
                </Text>
                <Pressable
                  style={[
                    styles.button,
                    (!confirmed || saving || !report.preview_token) &&
                      styles.disabled,
                  ]}
                  disabled={!confirmed || saving || !report.preview_token}
                  onPress={complete}
                >
                  {saving ? (
                    <ActivityIndicator color={C.surface} />
                  ) : (
                    <Text style={styles.buttonText}>
                      Xác nhận doanh thu và đóng lệnh
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  disabled={saving}
                  style={styles.secondaryButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.secondaryText}>
                    Quay lại kiểm tra danh sách khách
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.button}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.buttonText}>Về chi tiết chuyến</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 16, gap: 16 },
  intro: { gap: 8, paddingVertical: 8 },
  title: { fontSize: 23, fontWeight: '800', color: C.textPrimary },
  heading: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  hint: { fontSize: 13, lineHeight: 20, color: C.textSecondary },
  body: { fontSize: 15, color: C.textPrimary },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.surface,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  revenue: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: C.primaryLight,
    gap: 8,
  },
  amount: { fontSize: 32, fontWeight: '800', color: C.primaryDark },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowLabel: { flex: 1, fontSize: 14, lineHeight: 21, color: C.textPrimary },
  rowValue: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: C.textPrimary,
  },
  line: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 5 },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: C.primaryDark,
    padding: 12,
  },
  buttonText: {
    color: C.surface,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: { opacity: 0.45 },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: { fontSize: 14, color: C.primaryDark, fontWeight: '600' },
  errorBox: { padding: 14, borderRadius: 12, backgroundColor: C.dangerLight },
  error: { color: C.danger, fontSize: 14, lineHeight: 21 },
});
