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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';
import { Vehicle, VehicleStatus } from '../../types/vehicle';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;

const VEHICLE_ENDPOINT = '/api/nhaxe/vehicles/';

const statusMeta: Record<
  VehicleStatus,
  { label: string; color: string; backgroundColor: string; icon: IconName }
> = {
  active: {
    label: 'Đang hoạt động',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
    icon: 'checkmark-circle-outline',
  },
  maintenance: {
    label: 'Bảo dưỡng',
    color: APP_COLORS.warning,
    backgroundColor: APP_COLORS.warningLight,
    icon: 'construct-outline',
  },
  inactive: {
    label: 'Ngưng hoạt động',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
    icon: 'ban-outline',
  },
};

function formatDate(value: string) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

export function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicle = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const data = await requestJson<Vehicle>(
          `${VEHICLE_ENDPOINT}${vehicleId}/`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'vehicles-detail',
          },
        );
        setVehicle(data);
      } catch (vehicleError) {
        const message =
          vehicleError instanceof Error
            ? vehicleError.message
            : 'Không thể tải chi tiết xe.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vehicleId],
  );

  useEffect(() => {
    fetchVehicle('initial');
  }, [fetchVehicle]);

  const meta = useMemo(
    () =>
      vehicle
        ? statusMeta[vehicle.status] || statusMeta.inactive
        : statusMeta.inactive,
    [vehicle],
  );

  return (
    <ScreenContainer
      title={vehicle?.license_plate || 'Chi tiết xe'}
      subtitle={
        vehicle
          ? `${vehicle.brand || 'Chưa cập nhật'} ${vehicle.model || ''}`.trim()
          : 'Thông tin hồ sơ xe'
      }
      headerRight={
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={APP_COLORS.primaryDark}
          />
        </Pressable>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchVehicle('refresh')}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        {error ? (
          <View style={styles.feedbackCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={APP_COLORS.danger}
            />
            <Text style={styles.feedbackTitle}>Không tải được dữ liệu</Text>
            <Text style={styles.feedbackText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchVehicle('initial')}
            >
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !error ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={APP_COLORS.primaryDark} />
            <Text style={styles.feedbackText}>Đang tải chi tiết xe...</Text>
          </View>
        ) : null}

        {vehicle && !loading && !error ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.plateIcon}>
                <Ionicons
                  name="bus-outline"
                  size={28}
                  color={APP_COLORS.primaryDark}
                />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.plateText}>{vehicle.license_plate}</Text>
                <Text style={styles.vehicleName}>
                  {vehicle.vehicle_type_name || 'Chưa có loại xe'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: meta.backgroundColor },
                ]}
              >
                <Ionicons name={meta.icon} size={14} color={meta.color} />
                <Text style={[styles.statusText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin xe</Text>
              <View style={styles.detailGrid}>
                <DetailItem
                  icon="business-outline"
                  label="Hãng"
                  value={vehicle.brand || 'Chưa cập nhật'}
                />
                <DetailItem
                  icon="car-sport-outline"
                  label="Dòng xe"
                  value={vehicle.model || 'Chưa cập nhật'}
                />
                <DetailItem
                  icon="calendar-outline"
                  label="Năm sản xuất"
                  value={vehicle.year ? String(vehicle.year) : 'Chưa cập nhật'}
                />
                <DetailItem
                  icon="people-outline"
                  label="Số ghế"
                  value={
                    vehicle.seat_count
                      ? `${vehicle.seat_count} ghế`
                      : 'Chưa cập nhật'
                  }
                />
                <DetailItem
                  icon="color-palette-outline"
                  label="Màu xe"
                  value={vehicle.color || 'Chưa cập nhật'}
                />
                <DetailItem
                  icon="power-outline"
                  label="Kích hoạt"
                  value={vehicle.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tiện ích</Text>
              <View style={styles.featureGrid}>
                <FeaturePill
                  icon="snow-outline"
                  label="Điều hoà"
                  enabled={vehicle.has_ac}
                />
                <FeaturePill
                  icon="wifi-outline"
                  label="Wi-Fi"
                  enabled={vehicle.has_wifi}
                />
                <FeaturePill
                  icon="flash-outline"
                  label="USB"
                  enabled={vehicle.has_usb}
                />
                <FeaturePill
                  icon="tv-outline"
                  label="TV"
                  enabled={vehicle.has_tv}
                />
                <FeaturePill
                  icon="water-outline"
                  label="Toilet"
                  enabled={vehicle.has_toilet}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Giấy tờ</Text>
              <View style={styles.detailGrid}>
                <DetailItem
                  icon="shield-checkmark-outline"
                  label="Bảo hiểm"
                  value={formatDate(vehicle.insurance_expiry)}
                />
                <DetailItem
                  icon="document-text-outline"
                  label="Đăng kiểm"
                  value={formatDate(vehicle.registration_expiry)}
                />
                <DetailItem
                  icon="time-outline"
                  label="Tạo lúc"
                  value={formatDateTime(vehicle.created_at)}
                />
                <DetailItem
                  icon="refresh-outline"
                  label="Cập nhật"
                  value={formatDateTime(vehicle.updated_at)}
                />
              </View>
            </View>

            {vehicle.notes ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ghi chú</Text>
                <Text style={styles.notesText}>{vehicle.notes}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={16} color={APP_COLORS.primaryDark} />
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function FeaturePill({
  icon,
  label,
  enabled,
}: {
  icon: IconName;
  label: string;
  enabled: boolean;
}) {
  return (
    <View style={[styles.featurePill, !enabled && styles.featurePillDisabled]}>
      <Ionicons
        name={enabled ? icon : 'remove-circle-outline'}
        size={16}
        color={enabled ? APP_COLORS.primaryDark : APP_COLORS.textSecondary}
      />
      <Text
        style={[styles.featureText, !enabled && styles.featureTextDisabled]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 18,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    gap: 8,
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
  retryButton: {
    marginTop: 4,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: APP_COLORS.primaryLight,
  },
  retryButtonText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
  },
  plateText: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  vehicleName: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  section: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: APP_COLORS.surface,
    gap: 10,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    width: '48%',
    minHeight: 58,
    borderRadius: 10,
    padding: 9,
    backgroundColor: APP_COLORS.background,
    flexDirection: 'row',
    gap: 7,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  detailValue: {
    marginTop: 3,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featurePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featurePillDisabled: {
    backgroundColor: APP_COLORS.background,
  },
  featureText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  featureTextDisabled: {
    color: APP_COLORS.textSecondary,
  },
  notesText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
