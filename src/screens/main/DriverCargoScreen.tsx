import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type Relation = false | [number, string];

type DriverCargo = {
  id: number;
  name?: string;
  code?: string;
  reference?: string;
  state?: string;
  trip_id?: Relation;
  trip?: { id?: number; name?: string };
  sender_name?: string;
  sender_phone?: string;
  receiver_name?: string;
  receiver_phone?: string;
  pickup_location?: string;
  dropoff_location?: string;
  description?: string;
  quantity?: number;
  amount?: number | string;
  cod_amount?: number | string;
};

type CargoResponse =
  | DriverCargo[]
  | { results?: DriverCargo[]; cargo?: DriverCargo[] };

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCargo(data: CargoResponse) {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results || data.cargo || [];
}

function cargoCode(item: DriverCargo) {
  return item.code || item.reference || item.name || `Đơn hàng #${item.id}`;
}

function tripName(item: DriverCargo) {
  if (item.trip?.name) {
    return item.trip.name;
  }
  return Array.isArray(item.trip_id) ? item.trip_id[1] : 'Chưa cập nhật chuyến';
}

function stateLabel(state?: string) {
  const labels: Record<string, string> = {
    draft: 'Nháp',
    confirmed: 'Đã xác nhận',
    picked_up: 'Đã nhận hàng',
    in_transit: 'Đang vận chuyển',
    delivered: 'Đã giao',
  };
  return state ? labels[state] || state : 'Chưa cập nhật';
}

function formatMoney(value?: number | string) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return `${number.toLocaleString('vi-VN')}đ`;
}

export function DriverCargoScreen() {
  const [cargo, setCargo] = useState<DriverCargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const date = formatQueryDate(new Date());

  const loadCargo = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date_from: date,
          date_to: date,
          limit: '200',
        });
        const data = await requestJson<CargoResponse>(
          `/api/nhaxe/odoo/driver/me/cargo/?${params.toString()}`,
          { method: 'GET', auth: true, logLabel: 'driver-my-cargo' },
        );
        setCargo(normalizeCargo(data));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không tải được hàng cần lấy.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  useEffect(() => {
    loadCargo();
  }, [loadCargo]);

  const filteredCargo = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) {
      return cargo;
    }
    return cargo.filter(item =>
      [
        cargoCode(item),
        tripName(item),
        item.sender_name,
        item.sender_phone,
        item.receiver_name,
        item.receiver_phone,
        item.pickup_location,
        item.dropoff_location,
      ].some(value =>
        String(value || '')
          .toLocaleLowerCase('vi')
          .includes(keyword),
      ),
    );
  }, [cargo, search]);

  return (
    <ScreenContainer
      title="Hàng hoá"
      subtitle={`${cargo.length} kiện cần lấy trong các chuyến hôm nay`}
    >
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={20}
          color={APP_COLORS.placeholder}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm mã hàng, người gửi, điểm lấy..."
          placeholderTextColor={APP_COLORS.placeholder}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={20}
              color={APP_COLORS.placeholder}
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCargo('refresh')}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        {loading ? (
          <StateCard loading message="Đang tải danh sách hàng từ Odoo..." />
        ) : error ? (
          <StateCard error message={error} onRetry={() => loadCargo()} />
        ) : filteredCargo.length === 0 ? (
          <StateCard
            message={
              search
                ? 'Không tìm thấy kiện hàng phù hợp.'
                : 'Hôm nay không có hàng cần lấy.'
            }
          />
        ) : (
          filteredCargo.map(item => {
            const cod = formatMoney(item.cod_amount ?? item.amount);
            return (
              <View key={item.id} style={styles.cargoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cargoCode}>{cargoCode(item)}</Text>
                    <Text style={styles.tripName}>{tripName(item)}</Text>
                  </View>
                  <View style={styles.stateBadge}>
                    <Text style={styles.stateText}>
                      {stateLabel(item.state)}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={styles.description}>{item.description}</Text>
                ) : null}
                <InfoLine
                  icon="person-outline"
                  label="Người gửi"
                  value={
                    [item.sender_name, item.sender_phone]
                      .filter(Boolean)
                      .join(' • ') || 'Chưa cập nhật'
                  }
                />
                <InfoLine
                  icon="navigate-outline"
                  label="Điểm lấy"
                  value={item.pickup_location || 'Chưa cập nhật'}
                  emphasize
                />
                <InfoLine
                  icon="person-circle-outline"
                  label="Người nhận"
                  value={
                    [item.receiver_name, item.receiver_phone]
                      .filter(Boolean)
                      .join(' • ') || 'Chưa cập nhật'
                  }
                />
                <InfoLine
                  icon="flag-outline"
                  label="Điểm trả"
                  value={item.dropoff_location || 'Chưa cập nhật'}
                />

                {item.quantity || cod ? (
                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>
                      Số lượng: {item.quantity || 1}
                    </Text>
                    {cod ? (
                      <Text style={styles.codText}>Thu hộ: {cod}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoLine({
  icon,
  label,
  value,
  emphasize,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={17}
        color={emphasize ? APP_COLORS.primaryDark : APP_COLORS.textSecondary}
      />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, emphasize && styles.infoValueEmphasize]}
        >
          {value}
        </Text>
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
          name={error ? 'alert-circle-outline' : 'cube-outline'}
          size={30}
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
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    backgroundColor: APP_COLORS.surface,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    paddingVertical: 9,
  },
  content: { paddingBottom: 24, gap: 11 },
  cargoCard: {
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleWrap: { flex: 1, paddingRight: 8 },
  cargoCode: { color: APP_COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  tripName: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  stateBadge: {
    backgroundColor: APP_COLORS.warningLight,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stateText: { color: APP_COLORS.warning, fontSize: 11, fontWeight: '700' },
  description: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryLight,
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 9,
  },
  infoContent: { flex: 1 },
  infoLabel: { color: APP_COLORS.placeholder, fontSize: 11 },
  infoValue: { color: APP_COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  infoValueEmphasize: { color: APP_COLORS.primaryDark, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  footerText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  codText: { color: APP_COLORS.success, fontSize: 12, fontWeight: '800' },
  stateCard: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  stateMessage: {
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: APP_COLORS.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
  },
  retryText: { color: APP_COLORS.surface, fontWeight: '700' },
});
