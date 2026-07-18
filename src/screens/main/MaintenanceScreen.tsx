import { ComponentProps, useCallback, useEffect, useState } from 'react';
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
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];
type OdooRelation = false | [number, string];

type OdooMaintenance = {
  id: number;
  name?: string;
  code?: string;
  vehicle_id?: OdooRelation;
  vehicle?: {
    id?: number;
    name?: string;
    license_plate?: string;
  };
  maintenance_type?: string;
  service_type?: string;
  scheduled_date?: string;
  maintenance_date?: string;
  date?: string;
  completion_date?: string;
  next_maintenance_date?: string;
  odometer?: number | string;
  current_odometer?: number | string;
  cost?: number | string;
  amount?: number | string;
  state?: string;
  status?: string;
  description?: string;
  note?: string;
};

type MaintenanceResponse =
  | OdooMaintenance[]
  | {
      results?: OdooMaintenance[];
      maintenance?: OdooMaintenance[];
      records?: OdooMaintenance[];
    };

type StatusMeta = {
  label: string;
  color: string;
  backgroundColor: string;
  icon: IconName;
};

const MAINTENANCE_ENDPOINT = '/api/nhaxe/odoo/maintenance/';

const statusMap: Record<string, StatusMeta> = {
  draft: {
    label: 'Nháp',
    color: APP_COLORS.textSecondary,
    backgroundColor: APP_COLORS.primaryLight,
    icon: 'document-outline',
  },
  scheduled: {
    label: 'Đã lên lịch',
    color: APP_COLORS.info,
    backgroundColor: APP_COLORS.infoLight,
    icon: 'calendar-outline',
  },
  pending: {
    label: 'Chờ xử lý',
    color: APP_COLORS.warning,
    backgroundColor: APP_COLORS.warningLight,
    icon: 'time-outline',
  },
  in_progress: {
    label: 'Đang bảo dưỡng',
    color: APP_COLORS.warning,
    backgroundColor: APP_COLORS.warningLight,
    icon: 'construct-outline',
  },
  done: {
    label: 'Hoàn thành',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
    icon: 'checkmark-circle-outline',
  },
  completed: {
    label: 'Hoàn thành',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
    icon: 'checkmark-circle-outline',
  },
  cancelled: {
    label: 'Đã huỷ',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
    icon: 'close-circle-outline',
  },
  canceled: {
    label: 'Đã huỷ',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
    icon: 'close-circle-outline',
  },
};

const defaultStatus: StatusMeta = {
  label: 'Chưa cập nhật',
  color: APP_COLORS.textSecondary,
  backgroundColor: APP_COLORS.primaryLight,
  icon: 'help-circle-outline',
};

function normalizeMaintenance(data: MaintenanceResponse) {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results || data.maintenance || data.records || [];
}

function getVehicleName(item: OdooMaintenance) {
  return (
    item.vehicle?.license_plate ||
    item.vehicle?.name ||
    (Array.isArray(item.vehicle_id) ? item.vehicle_id[1] : '') ||
    'Chưa cập nhật xe'
  );
}

function getMaintenanceName(item: OdooMaintenance) {
  return (
    item.maintenance_type ||
    item.service_type ||
    item.name ||
    item.code ||
    `Bảo dưỡng #${item.id}`
  );
}

function formatDate(value?: string) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

function formatOdometer(value?: number | string) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toLocaleString('vi-VN')} km`
    : 'Chưa cập nhật';
}

function formatMoney(value?: number | string) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toLocaleString('vi-VN')}đ`
    : 'Chưa cập nhật';
}

function getStatus(item: OdooMaintenance) {
  const state = (item.state || item.status || '').toLowerCase();
  return (
    statusMap[state] || {
      ...defaultStatus,
      label: item.state || item.status || defaultStatus.label,
    }
  );
}

export function MaintenanceScreen() {
  const [maintenance, setMaintenance] = useState<OdooMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaintenance = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const data = await requestJson<MaintenanceResponse>(
          `${MAINTENANCE_ENDPOINT}?limit=200`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'odoo-maintenance-list',
          },
        );
        setMaintenance(normalizeMaintenance(data));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải danh sách bảo dưỡng.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadMaintenance();
  }, [loadMaintenance]);

  return (
    <ScreenContainer
      title="Bảo dưỡng"
      subtitle="Dữ liệu bảo dưỡng đồng bộ"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMaintenance('refresh')}
            tintColor={APP_COLORS.primaryDark}
            colors={[APP_COLORS.primaryDark]}
          />
        }
      >
        {loading ? (
          <StateCard loading message="Đang tải dữ liệu bảo dưỡng..." />
        ) : error ? (
          <StateCard error message={error} onRetry={() => loadMaintenance()} />
        ) : maintenance.length === 0 ? (
          <StateCard message="Chưa có bảo dưỡng nào" />
        ) : (
          maintenance.map(item => <MaintenanceCard key={item.id} item={item} />)
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function MaintenanceCard({ item }: { item: OdooMaintenance }) {
  const status = getStatus(item);
  const scheduledDate =
    item.scheduled_date || item.maintenance_date || item.date;
  const note = item.description || item.note;

  return (
    <View style={styles.maintenanceCard}>
      <View style={styles.cardHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.vehicleName}>{getVehicleName(item)}</Text>
          <Text style={styles.maintenanceName}>{getMaintenanceName(item)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.backgroundColor },
          ]}
        >
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoItem
          icon="calendar-outline"
          label="Ngày bảo dưỡng"
          value={formatDate(scheduledDate)}
        />
        <InfoItem
          icon="speedometer-outline"
          label="Số km"
          value={formatOdometer(item.odometer ?? item.current_odometer)}
        />
        <InfoItem
          icon="cash-outline"
          label="Chi phí"
          value={formatMoney(item.cost ?? item.amount)}
        />
        <InfoItem
          icon="checkmark-done-outline"
          label="Hoàn thành"
          value={formatDate(item.completion_date)}
        />
      </View>

      {item.next_maintenance_date ? (
        <View style={styles.nextMaintenance}>
          <Ionicons
            name="notifications-outline"
            size={16}
            color={APP_COLORS.primaryDark}
          />
          <Text style={styles.nextMaintenanceText}>
            Lần tiếp theo: {formatDate(item.next_maintenance_date)}
          </Text>
        </View>
      ) : null}

      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={17} color={APP_COLORS.textSecondary} />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function StateCard({
  message,
  loading,
  error,
  onRetry,
}: {
  message: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      {loading ? (
        <ActivityIndicator color={APP_COLORS.primaryDark} />
      ) : (
        <Ionicons
          name={error ? 'alert-circle-outline' : 'construct-outline'}
          size={34}
          color={error ? APP_COLORS.danger : APP_COLORS.primaryDark}
        />
      )}
      <Text style={styles.stateMessage}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  maintenanceCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  vehicleName: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  maintenanceName: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  infoItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  infoTextWrap: {
    flex: 1,
    marginLeft: 7,
  },
  infoLabel: {
    color: APP_COLORS.placeholder,
    fontSize: 11,
  },
  infoValue: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  nextMaintenance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    padding: 10,
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryLight,
  },
  nextMaintenanceText: {
    flex: 1,
    marginLeft: 7,
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  note: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  stateCard: {
    margin: 16,
    padding: 28,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  stateMessage: {
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 11,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 13,
    backgroundColor: APP_COLORS.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  retryText: {
    color: APP_COLORS.surface,
    fontWeight: '700',
  },
});
