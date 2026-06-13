import { ComponentProps, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

type PassengerBooking = {
  id: number;
  booking_code: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_location: string;
  dropoff_location: string;
  total_amount: string;
  payment_status: string;
  status: string;
  created_at: string;
};

type CargoBooking = {
  id: number;
  booking_code: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  delivery_location: string;
  shipping_fee: string;
  status: string;
  created_at: string;
};

type LookupResponse = {
  phone: string;
  passenger_bookings: PassengerBooking[];
  cargo_bookings: CargoBooking[];
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

export function CustomerHomeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const user = useAppSelector(state => state.auth.user);
  const defaultPhone = user?.phone_number || '';
  const displayName =
    user?.full_name || user?.first_name || user?.username || 'Quý khách';

  const [lookupPhone, setLookupPhone] = useState(defaultPhone);
  const [cargoSenderPhone, setCargoSenderPhone] = useState(defaultPhone);
  const [cargoReceiverPhone, setCargoReceiverPhone] = useState('');
  const [cargoRoute, setCargoRoute] = useState('');
  const [cargoNote, setCargoNote] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalOrders = useMemo(() => {
    if (!lookupResult) {
      return 0;
    }

    return (
      lookupResult.passenger_bookings.length +
      lookupResult.cargo_bookings.length
    );
  }, [lookupResult]);

  const lookupOrders = async (mode: 'initial' | 'refresh' = 'initial') => {
    const phone = lookupPhone.trim();
    if (!phone) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }

    if (mode === 'initial') {
      setLookupLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const data = await requestJson<LookupResponse>(
        `/api/nhaxe/lookup/?phone=${encodeURIComponent(phone)}`,
        {
          method: 'GET',
          auth: true,
          logLabel: 'customer-lookup',
        },
      );
      setLookupResult(data);
    } catch (lookupError) {
      const message =
        lookupError instanceof Error
          ? lookupError.message
          : 'Không tra cứu được đơn hàng.';
      setError(message);
    } finally {
      setLookupLoading(false);
      setRefreshing(false);
    }
  };

  const submitCargoRequest = () => {
    if (!cargoSenderPhone.trim() || !cargoReceiverPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập SĐT gửi và nhận.');
      return;
    }

    Alert.alert(
      'Đã ghi nhận yêu cầu',
      'Nhà xe sẽ liên hệ lại để xác nhận thông tin gửi đồ.',
    );
    setCargoReceiverPhone('');
    setCargoRoute('');
    setCargoNote('');
  };

  return (
    <ScreenContainer
      title="Trang chủ"
      subtitle={`Xin chào, ${displayName}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => lookupOrders('refresh')}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="ticket-outline"
              size={28}
              color={APP_COLORS.primaryDark}
            />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Đặt vé xe</Text>
            <Text style={styles.heroMeta}>Chọn chuyến, chọn ghế, xác nhận vé</Text>
          </View>
          <Pressable
            style={styles.heroButton}
            onPress={() =>
              navigation.navigate('TicketBooking', {
                initialPhone: lookupPhone.trim() || defaultPhone,
                initialPassengerName: displayName,
              })
            }
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={APP_COLORS.surface}
            />
          </Pressable>
        </View>

        <View style={styles.actionGrid}>
          <QuickAction
            icon="bus-outline"
            title="Mua vé"
            text="Chọn chỗ nhanh"
            onPress={() =>
              navigation.navigate('TicketBooking', {
                initialPhone: lookupPhone.trim() || defaultPhone,
                initialPassengerName: displayName,
              })
            }
          />
          <QuickAction
            icon="cube-outline"
            title="Gửi đồ"
            text="Tạo yêu cầu"
            onPress={() => {
              setCargoSenderPhone(current => current || lookupPhone);
            }}
          />
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle icon="cube-outline" title="Gửi đồ" />
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>SĐT người gửi</Text>
              <TextInput
                value={cargoSenderPhone}
                onChangeText={setCargoSenderPhone}
                placeholder="0909000000"
                placeholderTextColor={APP_COLORS.textSecondary}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>SĐT người nhận</Text>
              <TextInput
                value={cargoReceiverPhone}
                onChangeText={setCargoReceiverPhone}
                placeholder="0912000000"
                placeholderTextColor={APP_COLORS.textSecondary}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tuyến / nơi giao</Text>
            <TextInput
              value={cargoRoute}
              onChangeText={setCargoRoute}
              placeholder="Ví dụ: Hà Nội - Quảng Ninh"
              placeholderTextColor={APP_COLORS.textSecondary}
              style={styles.input}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ghi chú hàng</Text>
            <TextInput
              value={cargoNote}
              onChangeText={setCargoNote}
              placeholder="Tên hàng, số kiện, cân nặng"
              placeholderTextColor={APP_COLORS.textSecondary}
              style={[styles.input, styles.noteInput]}
              multiline
            />
          </View>
          <Pressable style={styles.primaryButton} onPress={submitCargoRequest}>
            <Ionicons name="send-outline" size={16} color={APP_COLORS.surface} />
            <Text style={styles.primaryButtonText}>Gửi yêu cầu</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <SectionTitle icon="search-outline" title="Tra cứu đơn hàng" />
          <View style={styles.lookupRow}>
            <TextInput
              value={lookupPhone}
              onChangeText={setLookupPhone}
              placeholder="Số điện thoại đặt vé / gửi đồ"
              placeholderTextColor={APP_COLORS.textSecondary}
              style={styles.lookupInput}
              keyboardType="phone-pad"
              returnKeyType="search"
              onSubmitEditing={() => lookupOrders('initial')}
            />
            <Pressable
              style={styles.lookupButton}
              onPress={() => lookupOrders('initial')}
              disabled={lookupLoading}
            >
              {lookupLoading ? (
                <ActivityIndicator color={APP_COLORS.surface} size="small" />
              ) : (
                <Ionicons name="search" size={17} color={APP_COLORS.surface} />
              )}
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {lookupResult ? (
            <View style={styles.resultSummary}>
              <Text style={styles.resultTitle}>{totalOrders} đơn hàng</Text>
              <Text style={styles.resultMeta}>SĐT: {lookupResult.phone}</Text>
            </View>
          ) : null}

          {lookupResult?.passenger_bookings.map(item => (
            <OrderCard
              key={`ticket-${item.id}`}
              icon="ticket-outline"
              title={item.booking_code}
              lines={[
                `Khách: ${item.passenger_name}`,
                `Điểm đón: ${item.pickup_location}`,
                `Điểm trả: ${item.dropoff_location}`,
                `Thanh toán: ${item.total_amount} (${item.payment_status})`,
                `Trạng thái: ${item.status}`,
                `Tạo lúc: ${formatDateTime(item.created_at)}`,
              ]}
            />
          ))}

          {lookupResult?.cargo_bookings.map(item => (
            <OrderCard
              key={`cargo-${item.id}`}
              icon="cube-outline"
              title={item.booking_code}
              lines={[
                `Người gửi: ${item.sender_name} (${item.sender_phone})`,
                `Người nhận: ${item.receiver_name}`,
                `Nơi giao: ${item.delivery_location}`,
                `Cước phí: ${item.shipping_fee}`,
                `Trạng thái: ${item.status}`,
                `Tạo lúc: ${formatDateTime(item.created_at)}`,
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={APP_COLORS.primaryDark} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  text,
  onPress,
}: {
  icon: IconName;
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={19} color={APP_COLORS.primaryDark} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickText}>{text}</Text>
    </Pressable>
  );
}

function OrderCard({
  icon,
  title,
  lines,
}: {
  icon: IconName;
  title: string;
  lines: string[];
}) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Ionicons name={icon} size={16} color={APP_COLORS.primaryDark} />
        <Text style={styles.orderTitle}>{title}</Text>
      </View>
      {lines.map(line => (
        <Text key={line} style={styles.orderLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  heroMeta: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.primaryLight,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
    marginBottom: 8,
  },
  quickTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  quickText: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 6,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.background,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lookupInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.background,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  lookupButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  errorText: {
    marginTop: 8,
    color: APP_COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  resultSummary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.primaryLight,
  },
  resultTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  resultMeta: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  orderCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.background,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  orderLine: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
