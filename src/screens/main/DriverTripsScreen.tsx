import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type Relation = false | [number, string];

type DriverTrip = {
  id: number;
  name?: string;
  state?: string;
  assignment_role?: 'driver' | 'co_driver' | string;
  departure_time?: string;
  arrival_time?: string;
  route_id?: Relation;
  vehicle_id?: Relation;
  route?: {
    name?: string;
    origin?: string;
    destination?: string;
  };
  vehicle?: {
    name?: string;
    license_plate?: string;
  };
  passenger_pickup_schedule?: DriverPassenger[];
  cargo_to_pickup?: DriverCargo[];
  summary?: DriverTripSummary;
};

type DriverPassenger = {
  id?: number;
  ticket_id?: number;
  passenger_name?: string;
  customer_name?: string;
  name?: string;
  phone?: string;
  phone_number?: string;
  seat?: string;
  seat_name?: string;
  seat_number?: string | number;
  pickup_location?: string;
  pickup_time?: string;
  dropoff_location?: string;
  state?: string;
  checkin_time?: string | false | null;
  checkout_time?: string | false | null;
};

type DriverCargo = {
  id?: number;
  name?: string;
  code?: string;
  sender_name?: string;
  receiver_name?: string;
  pickup_location?: string;
  state?: string;
};

type DriverTripSummary = {
  passenger_count?: number;
  total_passengers?: number;
  checked_in_count?: number;
  checked_out_count?: number;
  cargo_to_pickup_count?: number;
};

type TripListResponse =
  | DriverTrip[]
  | { results?: DriverTrip[]; trips?: DriverTrip[] };
type TripDetailResponse = DriverTrip | { trip?: DriverTrip };

const ACTIVE_STATES = 'confirmed,boarding,running';

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string | false | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(
    value.includes(' ') ? value.replace(' ', 'T') : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: string | false | null) {
  const date = parseDate(value);
  if (!date) {
    return 'Chưa cập nhật';
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relationName(value?: Relation) {
  return Array.isArray(value) ? value[1] : '';
}

function getRouteName(trip: DriverTrip) {
  if (trip.route?.origin && trip.route?.destination) {
    return `${trip.route.origin} → ${trip.route.destination}`;
  }
  return (
    trip.route?.name ||
    relationName(trip.route_id) ||
    trip.name ||
    `Chuyến #${trip.id}`
  );
}

function getVehicleName(trip: DriverTrip) {
  return (
    trip.vehicle?.license_plate ||
    trip.vehicle?.name ||
    relationName(trip.vehicle_id) ||
    'Chưa phân xe'
  );
}

function normalizeTrips(data: TripListResponse) {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results || data.trips || [];
}

function normalizeTripDetail(data: TripDetailResponse) {
  return 'trip' in data && data.trip ? data.trip : (data as DriverTrip);
}

function passengerId(passenger: DriverPassenger) {
  return passenger.ticket_id || passenger.id;
}

function passengerName(passenger: DriverPassenger) {
  return (
    passenger.passenger_name ||
    passenger.customer_name ||
    passenger.name ||
    'Hành khách'
  );
}

function passengerSeat(passenger: DriverPassenger) {
  return (
    passenger.seat_name ||
    passenger.seat ||
    passenger.seat_number ||
    'Chưa xếp ghế'
  );
}

function stateLabel(state?: string) {
  const labels: Record<string, string> = {
    draft: 'Nháp',
    confirmed: 'Đã xác nhận',
    boarding: 'Đang đón khách',
    running: 'Đang chạy',
    done: 'Hoàn thành',
    boarded: 'Đã lên xe',
  };
  return state ? labels[state] || state : 'Chưa cập nhật';
}

export function DriverTripsScreen() {
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<DriverTrip | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const scheduleDate = formatQueryDate(new Date());

  const loadTrips = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      mode === 'initial' ? setLoading(true) : setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date_from: scheduleDate,
          date_to: scheduleDate,
          states: ACTIVE_STATES,
          limit: '200',
        });
        const data = await requestJson<TripListResponse>(
          `/api/nhaxe/odoo/driver/me/trips/?${params.toString()}`,
          { method: 'GET', auth: true, logLabel: 'driver-my-trips' },
        );
        setTrips(normalizeTrips(data));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không tải được chuyến của bạn.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scheduleDate],
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const loadTripDetail = useCallback(async (tripId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await requestJson<TripDetailResponse>(
        `/api/nhaxe/odoo/driver/me/trips/${tripId}/`,
        { method: 'GET', auth: true, logLabel: 'driver-trip-detail' },
      );
      setSelectedTrip(normalizeTripDetail(data));
    } catch (loadError) {
      setDetailError(
        loadError instanceof Error
          ? loadError.message
          : 'Không tải được chi tiết chuyến.',
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openTrip = (trip: DriverTrip) => {
    setSelectedTrip(trip);
    loadTripDetail(trip.id);
  };

  const updatePassenger = async (
    passenger: DriverPassenger,
    action: 'check-in' | 'check-out',
  ) => {
    const ticketId = passengerId(passenger);
    if (!selectedTrip || !ticketId) {
      setDetailError('Không xác định được mã vé để cập nhật.');
      return;
    }
    const key = `${ticketId}-${action}`;
    setActionKey(key);
    setDetailError(null);
    try {
      await requestJson<unknown>(
        `/api/nhaxe/odoo/driver/me/trips/${selectedTrip.id}/passengers/${ticketId}/${action}/`,
        { method: 'POST', auth: true, logLabel: `driver-passenger-${action}` },
      );
      await loadTripDetail(selectedTrip.id);
    } catch (actionError) {
      setDetailError(
        actionError instanceof Error
          ? actionError.message
          : 'Không cập nhật được hành khách.',
      );
    } finally {
      setActionKey(null);
    }
  };

  const passengers = selectedTrip?.passenger_pickup_schedule || [];
  const cargo = selectedTrip?.cargo_to_pickup || [];
  const summary = selectedTrip?.summary;

  return (
    <>
      <ScreenContainer
        title="Chuyến của tôi"
        subtitle={`Lịch phân công ngày ${
          formatDateTime(`${scheduleDate}T00:00:00`).split(',')[0]
        }`}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTrips('refresh')}
              tintColor={APP_COLORS.primaryDark}
            />
          }
        >
          {loading ? (
            <StateCard loading message="Đang tải lịch chuyến..." />
          ) : error ? (
            <StateCard message={error} error onRetry={() => loadTrips()} />
          ) : trips.length === 0 ? (
            <StateCard message="Hôm nay bạn chưa được phân công chuyến nào." />
          ) : (
            trips.map(trip => (
              <Pressable
                key={trip.id}
                style={styles.tripCard}
                onPress={() => openTrip(trip)}
              >
                <View style={styles.tripHeader}>
                  <View style={styles.tripTitleWrap}>
                    <Text style={styles.tripTitle}>{getRouteName(trip)}</Text>
                    <Text style={styles.tripCode}>
                      {trip.name || `Chuyến #${trip.id}`}
                    </Text>
                  </View>
                  <View style={styles.stateBadge}>
                    <Text style={styles.stateBadgeText}>
                      {stateLabel(trip.state)}
                    </Text>
                  </View>
                </View>
                <InfoLine
                  icon="time-outline"
                  text={`Khởi hành: ${formatDateTime(trip.departure_time)}`}
                />
                <InfoLine
                  icon="bus-outline"
                  text={`Xe: ${getVehicleName(trip)}`}
                />
                <InfoLine
                  icon="person-outline"
                  text={
                    trip.assignment_role === 'co_driver'
                      ? 'Phân công: Phụ xe'
                      : 'Phân công: Tài xế chính'
                  }
                />
                <View style={styles.detailLink}>
                  <Text style={styles.detailLinkText}>Xem lịch đón khách</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={APP_COLORS.primaryDark}
                  />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </ScreenContainer>

      <Modal
        visible={Boolean(selectedTrip)}
        animationType="slide"
        onRequestClose={() => setSelectedTrip(null)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setSelectedTrip(null)}
            >
              <Ionicons name="close" size={24} color={APP_COLORS.textPrimary} />
            </Pressable>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Chi tiết chuyến</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {selectedTrip ? getRouteName(selectedTrip) : ''}
              </Text>
            </View>
            <Pressable
              style={styles.reloadButton}
              onPress={() => selectedTrip && loadTripDetail(selectedTrip.id)}
            >
              <Ionicons
                name="refresh"
                size={22}
                color={APP_COLORS.primaryDark}
              />
            </Pressable>
          </View>

          {detailLoading && passengers.length === 0 ? (
            <StateCard loading message="Đang tải lịch đón khách..." />
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {detailError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{detailError}</Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Hành khách"
                  value={
                    summary?.passenger_count ??
                    summary?.total_passengers ??
                    passengers.length
                  }
                />
                <SummaryItem
                  label="Đã lên xe"
                  value={
                    summary?.checked_in_count ??
                    passengers.filter(item => Boolean(item.checkin_time)).length
                  }
                />
                <SummaryItem
                  label="Đã xuống"
                  value={
                    summary?.checked_out_count ??
                    passengers.filter(item => Boolean(item.checkout_time))
                      .length
                  }
                />
                <SummaryItem
                  label="Hàng cần lấy"
                  value={summary?.cargo_to_pickup_count ?? cargo.length}
                />
              </View>

              <Text style={styles.sectionTitle}>Lịch đón hành khách</Text>
              {passengers.length === 0 ? (
                <Text style={styles.emptyText}>
                  Chưa có hành khách trong chuyến.
                </Text>
              ) : (
                passengers.map((passenger, index) => {
                  const id = passengerId(passenger);
                  const checkedIn =
                    Boolean(passenger.checkin_time) ||
                    passenger.state === 'boarded';
                  const checkedOut = Boolean(passenger.checkout_time);
                  return (
                    <View
                      key={id || `${passengerName(passenger)}-${index}`}
                      style={styles.passengerCard}
                    >
                      <View style={styles.passengerHeader}>
                        <View style={styles.seatBadge}>
                          <Text style={styles.seatText}>
                            {String(passengerSeat(passenger))}
                          </Text>
                        </View>
                        <View style={styles.passengerTitleWrap}>
                          <Text style={styles.passengerName}>
                            {passengerName(passenger)}
                          </Text>
                          <Text style={styles.passengerPhone}>
                            {passenger.phone_number ||
                              passenger.phone ||
                              'Chưa có SĐT'}
                          </Text>
                        </View>
                      </View>
                      <InfoLine
                        icon="location-outline"
                        text={`Đón: ${
                          passenger.pickup_location || 'Chưa cập nhật'
                        }`}
                      />
                      <InfoLine
                        icon="time-outline"
                        text={`Giờ đón: ${formatDateTime(
                          passenger.pickup_time,
                        )}`}
                      />
                      <InfoLine
                        icon="flag-outline"
                        text={`Trả: ${
                          passenger.dropoff_location || 'Chưa cập nhật'
                        }`}
                      />
                      <View style={styles.actionRow}>
                        <ActionButton
                          label={checkedIn ? 'Đã check-in' : 'Check-in'}
                          loading={actionKey === `${id}-check-in`}
                          disabled={checkedIn || !id || Boolean(actionKey)}
                          onPress={() => updatePassenger(passenger, 'check-in')}
                        />
                        <ActionButton
                          label={checkedOut ? 'Đã check-out' : 'Check-out'}
                          loading={actionKey === `${id}-check-out`}
                          disabled={
                            !checkedIn ||
                            checkedOut ||
                            !id ||
                            Boolean(actionKey)
                          }
                          secondary
                          onPress={() =>
                            updatePassenger(passenger, 'check-out')
                          }
                        />
                      </View>
                    </View>
                  );
                })
              )}

              <Text style={styles.sectionTitle}>Hàng cần lấy</Text>
              {cargo.length === 0 ? (
                <Text style={styles.emptyText}>
                  Không có hàng cần lấy trong chuyến.
                </Text>
              ) : (
                cargo.map((item, index) => (
                  <View
                    key={item.id || `${item.code}-${index}`}
                    style={styles.cargoCard}
                  >
                    <Text style={styles.cargoTitle}>
                      {item.code || item.name || `Đơn hàng #${item.id}`}
                    </Text>
                    <Text style={styles.metaText}>
                      Người gửi: {item.sender_name || 'Chưa cập nhật'}
                    </Text>
                    <Text style={styles.metaText}>
                      Người nhận: {item.receiver_name || 'Chưa cập nhật'}
                    </Text>
                    <Text style={styles.metaText}>
                      Điểm lấy: {item.pickup_location || 'Chưa cập nhật'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

function InfoLine({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={16} color={APP_COLORS.textSecondary} />
      <Text style={styles.infoText}>{text}</Text>
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
          name={error ? 'alert-circle-outline' : 'calendar-outline'}
          size={30}
          color={error ? APP_COLORS.danger : APP_COLORS.primaryDark}
        />
      )}
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  loading,
  disabled,
  secondary,
  onPress,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        secondary && styles.actionButtonSecondary,
        disabled && styles.disabled,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={secondary ? APP_COLORS.primaryDark : APP_COLORS.surface}
        />
      ) : (
        <Text
          style={[styles.actionText, secondary && styles.actionTextSecondary]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, gap: 12 },
  tripCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripTitleWrap: { flex: 1, paddingRight: 8 },
  tripTitle: { color: APP_COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  tripCode: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  stateBadge: {
    backgroundColor: APP_COLORS.infoLight,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stateBadgeText: { color: APP_COLORS.info, fontSize: 11, fontWeight: '700' },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },
  infoText: { flex: 1, color: APP_COLORS.textSecondary, fontSize: 13 },
  detailLink: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  detailLinkText: {
    color: APP_COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  stateCard: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  stateText: {
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
  modalSafeArea: { flex: 1, backgroundColor: APP_COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  closeButton: { padding: 6 },
  reloadButton: { padding: 8 },
  modalTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  modalTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  modalContent: { padding: 16, paddingBottom: 32 },
  errorBox: {
    backgroundColor: APP_COLORS.dangerLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: APP_COLORS.danger, fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 7, marginBottom: 18 },
  summaryItem: {
    flex: 1,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 10,
    backgroundColor: APP_COLORS.primaryLight,
  },
  summaryValue: {
    color: APP_COLORS.primaryDark,
    fontSize: 19,
    fontWeight: '800',
  },
  summaryLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 3,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 10,
    marginBottom: 12,
  },
  passengerCard: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  seatBadge: {
    minWidth: 44,
    height: 38,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryLight,
  },
  seatText: { color: APP_COLORS.primaryDark, fontWeight: '800', fontSize: 12 },
  passengerTitleWrap: { flex: 1, marginLeft: 10 },
  passengerName: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  passengerPhone: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryDark,
  },
  actionButtonSecondary: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.primaryDark,
  },
  actionText: { color: APP_COLORS.surface, fontSize: 13, fontWeight: '700' },
  actionTextSecondary: { color: APP_COLORS.primaryDark },
  disabled: { opacity: 0.5 },
  cargoCard: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 11,
    padding: 12,
    marginBottom: 9,
  },
  cargoTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  metaText: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 3 },
});
