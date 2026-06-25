import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];
type OdooRelation = false | [number, string];

type OdooTripSummary = {
  id: number;
  name: string;
  state: string;
  route_id: OdooRelation;
  vehicle_id: OdooRelation;
  driver_id?: OdooRelation;
  departure_time: string;
  arrival_time?: string;
  price: number | string;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
  route?: {
    id?: number;
    name?: string;
    code?: string;
    origin?: string;
    destination?: string;
    distance_km?: number;
    duration_hours?: number;
    price?: number;
  };
  vehicle?: {
    id?: number;
    name?: string;
    license_plate?: string;
    seat_count?: number;
  };
  driver?: {
    id?: number;
    name?: string;
    phone?: string;
  } | null;
};

type TripsResponse = {
  results?: OdooTripSummary[];
};

type RouteGroup = {
  key: string;
  routeName: string;
  routeCode: string;
  trips: OdooTripSummary[];
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  lockedSeats: number;
};

type FilterKind = 'route' | 'vehicle' | 'driver';
type FilterOption = {
  key: string;
  label: string;
  count: number;
};

const ACTIVE_COLOR = APP_COLORS.primaryDark;
const TRIP_STATES = 'confirmed';
const TRIP_LIMIT = '50';

function formatQueryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function relationName(value: OdooRelation | undefined) {
  return Array.isArray(value) ? value[1] : 'Chưa cập nhật';
}

function parseOdooDateTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(value: string | undefined) {
  const date = parseOdooDateTime(value);
  if (!date) {
    return '--:--';
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHeaderDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${Number(day)} tháng ${month}, ${year}`;
}

function getRouteName(trip: OdooTripSummary) {
  if (trip.route?.origin && trip.route?.destination) {
    return `${trip.route.origin} - ${trip.route.destination}`;
  }

  return trip.route?.name || relationName(trip.route_id);
}

function getRouteCode(trip: OdooTripSummary) {
  if (trip.route?.code) {
    return trip.route.code;
  }

  const [origin, destination] = getRouteName(trip)
    .split(/\s*-\s*/)
    .map(part => part.trim());
  const initials = [origin, destination]
    .filter(Boolean)
    .map(part =>
      part
        .split(/\s+/)
        .map(word => word[0])
        .join('')
        .toUpperCase(),
    );

  return initials.length >= 2 ? `${initials[0]}-${initials[1]}` : trip.name;
}

function getRouteKey(trip: OdooTripSummary) {
  return String(
    trip.route?.id || (Array.isArray(trip.route_id) ? trip.route_id[0] : getRouteName(trip)),
  );
}

function getVehicleName(trip: OdooTripSummary) {
  return (
    trip.vehicle?.license_plate ||
    trip.vehicle?.name ||
    relationName(trip.vehicle_id)
  );
}

function getVehicleKey(trip: OdooTripSummary) {
  return String(
    trip.vehicle?.id ||
      (Array.isArray(trip.vehicle_id) ? trip.vehicle_id[0] : getVehicleName(trip)),
  );
}

function getDriverName(trip: OdooTripSummary) {
  return trip.driver?.name || relationName(trip.driver_id);
}

function getDriverKey(trip: OdooTripSummary) {
  return String(
    trip.driver?.id ||
      (Array.isArray(trip.driver_id) ? trip.driver_id[0] : getDriverName(trip)),
  );
}

function isPastTrip(trip: OdooTripSummary) {
  const departure = parseOdooDateTime(trip.departure_time);
  return departure ? departure.getTime() < Date.now() : false;
}

function createRouteGroup(key: string, routeName: string, routeCode: string): RouteGroup {
  return {
    key,
    routeName,
    routeCode,
    trips: [],
    totalSeats: 0,
    bookedSeats: 0,
    availableSeats: 0,
    lockedSeats: 0,
  };
}

function addTripToGroup(group: RouteGroup, trip: OdooTripSummary) {
  group.trips.push(trip);
  group.totalSeats += trip.total_seats || 0;
  group.bookedSeats += trip.booked_seats || 0;
  group.availableSeats += trip.available_seats || 0;
  group.lockedSeats += Math.max(
    (trip.total_seats || 0) - (trip.booked_seats || 0) - (trip.available_seats || 0),
    0,
  );
}

function sortTrips(trips: OdooTripSummary[]) {
  return [...trips].sort((a, b) => {
    const departureA = parseOdooDateTime(a.departure_time)?.getTime() || 0;
    const departureB = parseOdooDateTime(b.departure_time)?.getTime() || 0;
    return departureA - departureB;
  });
}

function groupTripsByRoute(trips: OdooTripSummary[]) {
  const map = new Map<string, RouteGroup>();

  trips.forEach(trip => {
    const routeName = getRouteName(trip);
    const routeCode = getRouteCode(trip);
    const key = getRouteKey(trip);
    const existing = map.get(key) || createRouteGroup(key, routeName, routeCode);

    addTripToGroup(existing, trip);
    map.set(key, existing);
  });

  return Array.from(map.values()).map(group => ({
    ...group,
    trips: sortTrips(group.trips),
  }));
}

function groupTripsAsSingleList(trips: OdooTripSummary[]) {
  const group = createRouteGroup('all', 'Tất cả chuyến', 'ALL');
  trips.forEach(trip => addTripToGroup(group, trip));
  return [{ ...group, trips: sortTrips(group.trips) }];
}

function buildFilterOptions(
  trips: OdooTripSummary[],
  getKey: (trip: OdooTripSummary) => string,
  getLabel: (trip: OdooTripSummary) => string,
) {
  const map = new Map<string, FilterOption>();

  trips.forEach(trip => {
    const key = getKey(trip);
    const label = getLabel(trip);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    map.set(key, { key, label, count: 1 });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'vi'),
  );
}

function FilterChip({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon?: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={active ? ACTIVE_COLOR : APP_COLORS.placeholder}
        />
      ) : null}
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={16}
        color={active ? ACTIVE_COLOR : APP_COLORS.placeholder}
      />
    </Pressable>
  );
}

export function DashboardScreen() {
  const [trips, setTrips] = useState<OdooTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleDate] = useState(() => formatQueryDate(new Date()));
  const [groupEnabled, setGroupEnabled] = useState(true);
  const [activeFilterKind, setActiveFilterKind] = useState<FilterKind | null>(null);
  const [selectedRouteKey, setSelectedRouteKey] = useState<string | null>(null);
  const [selectedVehicleKey, setSelectedVehicleKey] = useState<string | null>(null);
  const [selectedDriverKey, setSelectedDriverKey] = useState<string | null>(null);

  const loadTrips = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({
          date_from: scheduleDate,
          date_to: scheduleDate,
          states: TRIP_STATES,
          limit: TRIP_LIMIT,
        });
        const data = await requestJson<TripsResponse>(
          `/api/nhaxe/odoo/trips/?${params.toString()}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'admin-schedule-trips',
          },
        );

        setTrips(data.results || []);
      } catch (tripError) {
        const message =
          tripError instanceof Error
            ? tripError.message
            : 'Không tải được lịch chạy.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scheduleDate],
  );

  useEffect(() => {
    loadTrips('initial');
  }, [loadTrips]);

  const filteredTrips = useMemo(
    () =>
      trips.filter(trip => {
        if (selectedRouteKey && getRouteKey(trip) !== selectedRouteKey) {
          return false;
        }

        if (selectedVehicleKey && getVehicleKey(trip) !== selectedVehicleKey) {
          return false;
        }

        if (selectedDriverKey && getDriverKey(trip) !== selectedDriverKey) {
          return false;
        }

        return true;
      }),
    [selectedDriverKey, selectedRouteKey, selectedVehicleKey, trips],
  );

  const routeOptions = useMemo(
    () => buildFilterOptions(trips, getRouteKey, getRouteName),
    [trips],
  );
  const vehicleOptions = useMemo(
    () => buildFilterOptions(trips, getVehicleKey, getVehicleName),
    [trips],
  );
  const driverOptions = useMemo(
    () => buildFilterOptions(trips, getDriverKey, getDriverName),
    [trips],
  );
  const routeGroups = useMemo(
    () =>
      groupEnabled
        ? groupTripsByRoute(filteredTrips)
        : groupTripsAsSingleList(filteredTrips),
    [filteredTrips, groupEnabled],
  );
  const totalSeats = useMemo(
    () => filteredTrips.reduce((sum, trip) => sum + (trip.total_seats || 0), 0),
    [filteredTrips],
  );
  const bookedSeats = useMemo(
    () => filteredTrips.reduce((sum, trip) => sum + (trip.booked_seats || 0), 0),
    [filteredTrips],
  );
  const soldRate = totalSeats ? Math.round((bookedSeats / totalSeats) * 100) : 0;
  const selectedRouteLabel =
    routeOptions.find(option => option.key === selectedRouteKey)?.label || 'Tuyến';
  const selectedVehicleLabel =
    vehicleOptions.find(option => option.key === selectedVehicleKey)?.label || 'Biển số';
  const selectedDriverLabel =
    driverOptions.find(option => option.key === selectedDriverKey)?.label || 'Tài xế';
  const activeFilterCount = [
    selectedRouteKey,
    selectedVehicleKey,
    selectedDriverKey,
  ].filter(Boolean).length;
  const activeOptions =
    activeFilterKind === 'route'
      ? routeOptions
      : activeFilterKind === 'vehicle'
        ? vehicleOptions
        : activeFilterKind === 'driver'
          ? driverOptions
          : [];
  const activeFilterTitle =
    activeFilterKind === 'route'
      ? 'Lọc theo tuyến'
      : activeFilterKind === 'vehicle'
        ? 'Lọc theo biển số'
        : activeFilterKind === 'driver'
          ? 'Lọc theo tài xế'
          : '';

  const onRefresh = useCallback(() => {
    loadTrips('refresh');
  }, [loadTrips]);

  const selectFilterOption = (kind: FilterKind, key: string | null) => {
    if (kind === 'route') {
      setSelectedRouteKey(key);
    } else if (kind === 'vehicle') {
      setSelectedVehicleKey(key);
    } else {
      setSelectedDriverKey(key);
    }
  };

  const activeSelectedKey =
    activeFilterKind === 'route'
      ? selectedRouteKey
      : activeFilterKind === 'vehicle'
        ? selectedVehicleKey
        : activeFilterKind === 'driver'
          ? selectedDriverKey
          : null;

  const clearFilters = () => {
    setSelectedRouteKey(null);
    setSelectedVehicleKey(null);
    setSelectedDriverKey(null);
    setActiveFilterKind(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch chạy</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACTIVE_COLOR}
            colors={[ACTIVE_COLOR]}
          />
        }
      >
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateText}>
              {formatHeaderDate(scheduleDate)}{' '}
              <Text style={styles.dateTripText}>
                (AL {filteredTrips.length}/{trips.length || 0})
              </Text>
            </Text>
          </View>
          <Pressable
            style={styles.filterButton}
            onPress={() =>
              setActiveFilterKind(current => (current ? null : 'route'))
            }
          >
            <Ionicons name="filter-outline" size={28} color={APP_COLORS.textPrimary} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.salesRow}>
          <Text style={styles.salesText}>
            Đã bán: {bookedSeats}/{totalSeats} vé ({soldRate}%)
          </Text>
          <Pressable style={styles.statsLink}>
            <Text style={styles.statsText}>Thống kê ngày</Text>
            <Ionicons name="chevron-forward" size={24} color={ACTIVE_COLOR} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <View style={styles.tuneIconWrap}>
            <Ionicons name="options-outline" size={24} color={APP_COLORS.textPrimary} />
          </View>
          <FilterChip
            label={`Gom nhóm (${routeGroups.length})`}
            active={groupEnabled}
            onPress={() => setGroupEnabled(value => !value)}
          />
          <FilterChip
            label={selectedRouteLabel}
            active={activeFilterKind === 'route' || Boolean(selectedRouteKey)}
            onPress={() =>
              setActiveFilterKind(current => (current === 'route' ? null : 'route'))
            }
          />
          <FilterChip
            label={selectedVehicleLabel}
            active={activeFilterKind === 'vehicle' || Boolean(selectedVehicleKey)}
            onPress={() =>
              setActiveFilterKind(current =>
                current === 'vehicle' ? null : 'vehicle',
              )
            }
          />
          <FilterChip
            label={selectedDriverLabel}
            active={activeFilterKind === 'driver' || Boolean(selectedDriverKey)}
            onPress={() =>
              setActiveFilterKind(current =>
                current === 'driver' ? null : 'driver',
              )
            }
          />
        </ScrollView>

        {activeFilterKind ? (
          <View style={styles.filterPanel}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>{activeFilterTitle}</Text>
              <Pressable onPress={clearFilters}>
                <Text style={styles.clearFilterText}>Xóa lọc</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterOptionsRow}
            >
              <Pressable
                style={[
                  styles.filterOption,
                  !activeSelectedKey && styles.filterOptionActive,
                ]}
                onPress={() => selectFilterOption(activeFilterKind, null)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !activeSelectedKey && styles.filterOptionTextActive,
                  ]}
                >
                  Tất cả
                </Text>
              </Pressable>
              {activeOptions.map(option => {
                const selected = option.key === activeSelectedKey;
                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.filterOption,
                      selected && styles.filterOptionActive,
                    ]}
                    onPress={() => selectFilterOption(activeFilterKind, option.key)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        selected && styles.filterOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.filterOptionCount,
                        selected && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={ACTIVE_COLOR} />
            <Text style={styles.stateText}>Đang tải lịch chạy từ Odoo...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={28} color={APP_COLORS.danger} />
            <Text style={styles.stateTitle}>Không tải được lịch chạy</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadTrips('initial')}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : routeGroups.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="calendar-clear-outline" size={28} color={ACTIVE_COLOR} />
            <Text style={styles.stateTitle}>Không có chuyến phù hợp</Text>
            <Text style={styles.stateText}>
              Thử bỏ bớt bộ lọc hoặc kéo xuống để tải lại lịch chạy.
            </Text>
            {activeFilterCount > 0 ? (
              <Pressable style={styles.retryButton} onPress={clearFilters}>
                <Text style={styles.retryText}>Xóa lọc</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          routeGroups.map(group => (
            <View key={group.key} style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <View style={styles.routeCircle}>
                  <Text style={styles.routeCircleSold}>{group.bookedSeats}</Text>
                  <View style={styles.routeCircleDivider} />
                  <Text style={styles.routeCircleTotal}>{group.totalSeats}</Text>
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeTitle}>{group.routeName}</Text>
                  <Text style={styles.routeStats}>
                    TT: <Text style={styles.boldText}>0</Text> ĐC:{' '}
                    <Text style={styles.boldText}>{group.bookedSeats}</Text> Trống:{' '}
                    <Text style={styles.boldText}>{group.availableSeats}</Text> Khóa tổng:{' '}
                    <Text style={styles.boldText}>{group.lockedSeats}</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-up" size={24} color={ACTIVE_COLOR} />
              </View>

              <View style={styles.routeBodyHeader}>
                <Text style={styles.tripCountText}>{group.trips.length} chuyến</Text>
                <Pressable style={styles.addTripButton}>
                  <Text style={styles.addTripText}>Tăng cường</Text>
                  <Ionicons name="add" size={30} color={ACTIVE_COLOR} />
                </Pressable>
              </View>

              <View style={styles.tripGrid}>
                {group.trips.map(trip => (
                  <View key={trip.id} style={styles.tripTile}>
                    <View style={styles.tripTileTop}>
                      <Text
                        style={[
                          styles.tripTime,
                          isPastTrip(trip) && styles.tripTimePast,
                        ]}
                      >
                        {formatTime(trip.departure_time)}
                      </Text>
                      <Text style={styles.tripSeats}>
                        {trip.booked_seats}|{trip.available_seats}
                      </Text>
                    </View>
                    <Text style={styles.tripRouteCode} numberOfLines={1}>
                      {group.routeCode}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 22,
  },
  headerTitle: {
    color: APP_COLORS.surface,
    fontSize: 24,
    fontWeight: '700',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 9,
    backgroundColor: APP_COLORS.surface,
    shadowColor: APP_COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dateBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: {
    color: APP_COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  dateTripText: {
    color: ACTIVE_COLOR,
    fontSize: 17,
    fontWeight: '700',
  },
  filterButton: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: APP_COLORS.border,
  },
  filterBadge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE_COLOR,
  },
  filterBadgeText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 16,
  },
  salesText: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  statsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    color: ACTIVE_COLOR,
    fontSize: 18,
    fontWeight: '500',
  },
  filterRow: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  tuneIconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
    paddingRight: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    borderRadius: 5,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.primaryLight,
  },
  filterText: {
    color: APP_COLORS.placeholder,
    fontSize: 16,
    fontWeight: '500',
  },
  filterTextActive: {
    color: ACTIVE_COLOR,
  },
  filterPanel: {
    marginHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    backgroundColor: APP_COLORS.surface,
    padding: 12,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  filterPanelTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  clearFilterText: {
    color: ACTIVE_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  filterOptionsRow: {
    gap: 8,
  },
  filterOption: {
    minHeight: 36,
    maxWidth: 190,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 6,
    backgroundColor: APP_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  filterOptionActive: {
    borderColor: ACTIVE_COLOR,
    backgroundColor: APP_COLORS.primaryLight,
  },
  filterOptionText: {
    flexShrink: 1,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterOptionCount: {
    color: APP_COLORS.placeholder,
    fontSize: 12,
    fontWeight: '700',
  },
  filterOptionTextActive: {
    color: ACTIVE_COLOR,
  },
  routeCard: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 6,
    backgroundColor: APP_COLORS.surface,
    overflow: 'hidden',
    shadowColor: APP_COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  routeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 7,
    borderColor: APP_COLORS.primaryLight,
  },
  routeCircleSold: {
    color: ACTIVE_COLOR,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  routeCircleDivider: {
    width: 22,
    height: 1,
    backgroundColor: APP_COLORS.border,
    marginVertical: 2,
  },
  routeCircleTotal: {
    color: APP_COLORS.placeholder,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    color: ACTIVE_COLOR,
    fontSize: 21,
    fontWeight: '700',
  },
  routeStats: {
    marginTop: 3,
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '400',
  },
  boldText: {
    fontWeight: '700',
  },
  routeBodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tripCountText: {
    color: APP_COLORS.placeholder,
    fontSize: 16,
    fontWeight: '400',
  },
  addTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTripText: {
    color: ACTIVE_COLOR,
    fontSize: 17,
    fontWeight: '500',
  },
  tripGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  tripTile: {
    width: '30.7%',
    minHeight: 74,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: APP_COLORS.surface,
  },
  tripTileTop: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    backgroundColor: APP_COLORS.primaryLight,
    paddingHorizontal: 7,
  },
  tripTime: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  tripTimePast: {
    color: APP_COLORS.danger,
  },
  tripSeats: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  tripRouteCode: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingTop: 9,
  },
  stateCard: {
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 18,
    borderRadius: 8,
    padding: 20,
    backgroundColor: APP_COLORS.surface,
    gap: 8,
  },
  stateTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 6,
    backgroundColor: ACTIVE_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
