import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { MainTabParamList } from '../../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = BottomTabScreenProps<MainTabParamList, 'CustomerOrders'>;
type OdooRelation = false | [number, string];

type CargoBooking = {
  id: number;
  name?: string;
  booking_code?: string;
  trip_id?: OdooRelation;
  route_id?: OdooRelation;
  departure_time?: string;
  sender_name: string;
  sender_phone: string;
  pickup_location?: string;
  receiver_name: string;
  receiver_phone?: string;
  delivery_location: string;
  cargo_description?: string;
  weight_kg?: number;
  quantity?: number;
  shipping_fee?: string | number;
  cod_amount?: string | number;
  total_collect_amount?: string | number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  state?: string;
  pickup_confirmed_at?: string | false;
  delivered_at?: string | false;
  created_at?: string;
  create_date?: string;
};

type CargoBookingListResponse = CargoBooking[] | {
  phone?: string;
  results?: CargoBooking[];
};

const cargoSteps = ['Đã tạo', 'Xác nhận', 'Đã nhận', 'Đang giao', 'Hoàn tất'];

function formatDateTime(value: string | false | undefined) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount) || amount <= 0) {
    return 'Đang cập nhật';
  }

  return amount.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
}

function normalizeStatus(value: string | undefined) {
  return (value || '').toLowerCase().replace(/\s+/g, '_');
}

function getCargoStepIndex(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized.includes('cancel')) {
    return 0;
  }
  if (normalized.includes('deliver')) {
    return 4;
  }
  if (normalized.includes('transit')) {
    return 3;
  }
  if (normalized.includes('pick')) {
    return 2;
  }
  if (normalized.includes('confirm')) {
    return 1;
  }
  return 0;
}

function relationName(value: OdooRelation | undefined) {
  return Array.isArray(value) ? value[1] : '';
}

export function CustomerOrdersScreen({ route }: Props) {
  const [search, setSearch] = useState('');
  const [cargoBookings, setCargoBookings] = useState<CargoBooking[]>([]);
  const [accountPhone, setAccountPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalOrders = useMemo(() => {
    return cargoBookings.length;
  }, [cargoBookings.length]);

  const lookupOrders = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const cargoParams = new URLSearchParams({
          limit: '100',
        });
        const searchTerm = search.trim();
        if (searchTerm) {
          cargoParams.set('search', searchTerm);
        }
        const cargoData = await requestJson<CargoBookingListResponse>(
          `/api/nhaxe/odoo/my-cargo-bookings/?${cargoParams.toString()}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'odoo-my-cargo-orders',
          },
        );

        setCargoBookings(
          Array.isArray(cargoData) ? cargoData : cargoData.results || [],
        );
        setAccountPhone(Array.isArray(cargoData) ? '' : cargoData.phone || '');
      } catch (lookupError) {
        const message =
          lookupError instanceof Error
            ? lookupError.message
            : 'Không tra cứu được đơn gửi hàng.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search],
  );

  useEffect(() => {
    lookupOrders('initial');
    // Search text should only submit when the user presses search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.refreshKey]);

  return (
    <ScreenContainer
      title="Theo dõi đơn"
      subtitle="Theo dõi đơn gửi hàng của tài khoản đang đăng nhập"
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
        <View style={styles.searchCard}>
          <View style={styles.searchInputWrap}>
            <Ionicons
              name="call-outline"
              size={17}
              color={APP_COLORS.textSecondary}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm mã đơn, địa chỉ, mô tả hàng"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => lookupOrders('initial')}
            />
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => lookupOrders('initial')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={APP_COLORS.surface} size="small" />
            ) : (
              <Ionicons name="search" size={17} color={APP_COLORS.surface} />
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.feedbackCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={APP_COLORS.danger}
            />
            <Text style={styles.feedbackTitle}>Không tải được đơn</Text>
            <Text style={styles.feedbackText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalOrders}</Text>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>Đơn gửi hàng của bạn</Text>
            <Text style={styles.summaryText}>
              Lấy theo tài khoản đang đăng nhập
              {accountPhone ? ` - SĐT: ${accountPhone}` : ''}
            </Text>
          </View>
        </View>

        {!loading && !error && totalOrders === 0 ? (
          <View style={styles.feedbackCard}>
            <Ionicons
              name="receipt-outline"
              size={26}
              color={APP_COLORS.primaryDark}
            />
            <Text style={styles.feedbackTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.feedbackText}>
              Khi bạn gửi đồ, trạng thái vận chuyển sẽ hiển thị tại đây.
            </Text>
          </View>
        ) : null}

        {cargoBookings.map(item => (
          <TrackingCard
            key={`cargo-${item.id}`}
            icon="cube-outline"
            title={item.name || item.booking_code || `Đơn #${item.id}`}
            badge="Gửi hàng"
            status={item.state || item.status || 'draft'}
            steps={cargoSteps}
            activeStep={getCargoStepIndex(item.state || item.status || 'draft')}
            lines={[
              `Tuyến: ${relationName(item.route_id) || relationName(item.trip_id) || 'Chưa cập nhật'}`,
              `Người gửi: ${item.sender_name} (${item.sender_phone})`,
              `Người nhận: ${item.receiver_name}`,
              `Nơi giao: ${item.delivery_location}`,
              ...(item.pickup_location ? [`Nơi nhận: ${item.pickup_location}`] : []),
              ...(item.cargo_description ? [`Hàng: ${item.cargo_description}`] : []),
              `Cước phí: ${formatMoney(item.shipping_fee)}`,
              `Thanh toán: ${item.payment_status || 'Chưa cập nhật'}`,
              ...(item.departure_time
                ? [`Giờ xe: ${formatDateTime(item.departure_time)}`]
                : []),
              `Tạo lúc: ${formatDateTime(item.created_at || item.create_date)}`,
            ]}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function TrackingCard({
  icon,
  title,
  badge,
  status,
  steps,
  activeStep,
  lines,
}: {
  icon: IconName;
  title: string;
  badge: string;
  status: string;
  steps: string[];
  activeStep: number;
  lines: string[];
}) {
  return (
    <View style={styles.trackingCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Ionicons name={icon} size={18} color={APP_COLORS.primaryDark} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={styles.statusText}>Trạng thái: {status}</Text>
      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const active = index <= activeStep;
          return (
            <View key={step} style={styles.timelineStep}>
              <View
                style={[
                  styles.timelineDot,
                  active && styles.timelineDotActive,
                ]}
              />
              <Text
                style={[
                  styles.timelineText,
                  active && styles.timelineTextActive,
                ]}
                numberOfLines={2}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>
      {lines.map(line => (
        <Text key={line} style={styles.cardLine}>
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
  searchCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    gap: 7,
  },
  feedbackTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryValue: {
    minWidth: 44,
    color: APP_COLORS.primaryDark,
    fontSize: 28,
    fontWeight: '900',
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryText: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  trackingCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  badgeText: {
    color: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
  },
  statusText: {
    marginTop: 6,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  timeline: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 6,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  timelineDotActive: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryDark,
  },
  timelineText: {
    color: APP_COLORS.placeholder,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  timelineTextActive: {
    color: APP_COLORS.textPrimary,
  },
  cardLine: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
