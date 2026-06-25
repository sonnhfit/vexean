import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
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

type ReinforceTripPayload = {
  departure_time: string;
  arrival_time?: string;
  vehicle_id?: number;
  driver_id?: number;
  co_driver_id?: number | null;
  state?: 'draft' | 'confirmed';
  note?: string;
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
type DateTimeField = 'departure' | 'arrival';
type PickerMode = 'date' | 'time';
type DateTimePickerState = {
  field: DateTimeField;
  mode: PickerMode;
} | null;

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

function formatIsoWithLocalOffset(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetRemainder = pad(absOffset % 60);

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':00',
    offsetSign,
    offsetHours,
    ':',
    offsetRemainder,
  ].join('');
}

function getDefaultReinforceDeparture(trips: OdooTripSummary[]) {
  const lastDeparture = sortTrips(trips)
    .map(trip => parseOdooDateTime(trip.departure_time))
    .filter((date): date is Date => Boolean(date))
    .at(-1);
  const date = lastDeparture ? new Date(lastDeparture) : new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return formatIsoWithLocalOffset(date);
}

function getDateFromDateTimeInput(value: string) {
  return parseOdooDateTime(value) || new Date();
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
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
  const [reinforceGroup, setReinforceGroup] = useState<RouteGroup | null>(null);
  const [reinforceSourceTripId, setReinforceSourceTripId] = useState<number | null>(
    null,
  );
  const [reinforceDepartureTime, setReinforceDepartureTime] = useState('');
  const [reinforceArrivalTime, setReinforceArrivalTime] = useState('');
  const [reinforceVehicleId, setReinforceVehicleId] = useState('');
  const [reinforceDriverId, setReinforceDriverId] = useState('');
  const [reinforceCoDriverId, setReinforceCoDriverId] = useState('');
  const [reinforceState, setReinforceState] = useState<'draft' | 'confirmed'>(
    'confirmed',
  );
  const [reinforceNote, setReinforceNote] = useState('');
  const [dateTimePicker, setDateTimePicker] =
    useState<DateTimePickerState>(null);
  const [reinforceSubmitting, setReinforceSubmitting] = useState(false);
  const [reinforceError, setReinforceError] = useState<string | null>(null);
  const [collapsedRouteKeys, setCollapsedRouteKeys] = useState<Set<string>>(
    () => new Set(),
  );

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

  const toggleRouteCollapsed = (routeKey: string) => {
    setCollapsedRouteKeys(current => {
      const next = new Set(current);
      if (next.has(routeKey)) {
        next.delete(routeKey);
      } else {
        next.add(routeKey);
      }
      return next;
    });
  };

  const openReinforceModal = (group: RouteGroup) => {
    const sourceTrip = group.trips[0];
    if (!sourceTrip) {
      return;
    }

    setReinforceGroup(group);
    setReinforceSourceTripId(sourceTrip.id);
    setReinforceDepartureTime(getDefaultReinforceDeparture(group.trips));
    setReinforceArrivalTime('');
    setReinforceVehicleId('');
    setReinforceDriverId('');
    setReinforceCoDriverId('');
    setReinforceState('confirmed');
    setReinforceNote('Chuyến tăng cường');
    setDateTimePicker(null);
    setReinforceError(null);
  };

  const closeReinforceModal = () => {
    if (reinforceSubmitting) {
      return;
    }

    setReinforceGroup(null);
    setReinforceSourceTripId(null);
    setDateTimePicker(null);
    setReinforceError(null);
  };

  const reinforceSourceTrip = useMemo(
    () =>
      reinforceGroup?.trips.find(trip => trip.id === reinforceSourceTripId) ||
      reinforceGroup?.trips[0] ||
      null,
    [reinforceGroup, reinforceSourceTripId],
  );

  const submitReinforceTrip = async () => {
    if (!reinforceSourceTrip) {
      setReinforceError('Chưa chọn chuyến gốc.');
      return;
    }

    const departureTime = reinforceDepartureTime.trim();
    if (!departureTime) {
      setReinforceError('Vui lòng nhập giờ khởi hành.');
      return;
    }

    if (!parseOdooDateTime(departureTime)) {
      setReinforceError('Giờ khởi hành chưa đúng định dạng ISO.');
      return;
    }

    const vehicleId = parseOptionalNumber(reinforceVehicleId);
    const driverId = parseOptionalNumber(reinforceDriverId);
    const coDriverIdInput = reinforceCoDriverId.trim();
    const coDriverId =
      coDriverIdInput.toLowerCase() === 'null'
        ? null
        : parseOptionalNumber(coDriverIdInput);
    const invalidCoDriverId =
      coDriverId === null && coDriverIdInput.toLowerCase() !== 'null';

    if (vehicleId === null || driverId === null || invalidCoDriverId) {
      setReinforceError('ID xe, tài xế hoặc phụ xe phải là số.');
      return;
    }

    const payload: ReinforceTripPayload = {
      departure_time: departureTime,
      state: reinforceState,
    };

    if (reinforceArrivalTime.trim()) {
      if (!parseOdooDateTime(reinforceArrivalTime.trim())) {
        setReinforceError('Giờ đến chưa đúng định dạng ISO.');
        return;
      }
      payload.arrival_time = reinforceArrivalTime.trim();
    }

    if (vehicleId !== undefined) {
      payload.vehicle_id = vehicleId;
    }

    if (driverId !== undefined) {
      payload.driver_id = driverId;
    }

    if (coDriverId !== undefined) {
      payload.co_driver_id = coDriverId;
    }

    if (reinforceNote.trim()) {
      payload.note = reinforceNote.trim();
    }

    setReinforceSubmitting(true);
    setReinforceError(null);

    try {
      const createdTrip = await requestJson<OdooTripSummary>(
        `/api/nhaxe/odoo/trips/${reinforceSourceTrip.id}/reinforce/`,
        {
          method: 'POST',
          auth: true,
          body: payload,
          logLabel: 'admin-reinforce-trip',
        },
      );

      setTrips(current => [
        ...current.filter(trip => trip.id !== createdTrip.id),
        createdTrip,
      ]);
      setReinforceGroup(null);
      setReinforceSourceTripId(null);
    } catch (reinforceTripError) {
      const message =
        reinforceTripError instanceof Error
          ? reinforceTripError.message
          : 'Không tạo được chuyến tăng cường.';
      setReinforceError(message);
    } finally {
      setReinforceSubmitting(false);
    }
  };

  const onDeparturePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === 'dismissed') {
      setDateTimePicker(null);
      return;
    }

    if (!selectedDate || !dateTimePicker) {
      return;
    }

    const currentValue =
      dateTimePicker.field === 'departure'
        ? reinforceDepartureTime
        : reinforceArrivalTime || reinforceDepartureTime;
    const currentDate = getDateFromDateTimeInput(currentValue);
    const nextDate = new Date(selectedDate);

    if (dateTimePicker.mode === 'date') {
      nextDate.setHours(
        currentDate.getHours(),
        currentDate.getMinutes(),
        0,
        0,
      );
    } else {
      nextDate.setFullYear(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      );
      nextDate.setSeconds(0, 0);
    }

    const nextValue = formatIsoWithLocalOffset(nextDate);
    if (dateTimePicker.field === 'departure') {
      setReinforceDepartureTime(nextValue);
    } else {
      setReinforceArrivalTime(nextValue);
    }

    if (Platform.OS === 'android') {
      setDateTimePicker(null);
    }
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
            hitSlop={8}
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
          <Pressable
            style={styles.tuneIconWrap}
            hitSlop={8}
            onPress={() =>
              setActiveFilterKind(current => (current ? null : 'route'))
            }
          >
            <Ionicons name="options-outline" size={24} color={APP_COLORS.textPrimary} />
          </Pressable>
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
          routeGroups.map(group => {
            const collapsed = collapsedRouteKeys.has(group.key);
            return (
            <View key={group.key} style={styles.routeCard}>
              <Pressable
                style={styles.routeHeader}
                onPress={() => toggleRouteCollapsed(group.key)}
              >
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
                <View style={styles.routeChevronButton}>
                  <Ionicons
                    name={collapsed ? 'chevron-down' : 'chevron-up'}
                    size={24}
                    color={ACTIVE_COLOR}
                  />
                </View>
              </Pressable>

              {!collapsed ? (
                <>
                  <View style={styles.routeBodyHeader}>
                    <Text style={styles.tripCountText}>{group.trips.length} chuyến</Text>
                    <Pressable
                      style={styles.addTripButton}
                      hitSlop={8}
                      onPress={() => openReinforceModal(group)}
                    >
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
                </>
              ) : null}
            </View>
          );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(reinforceGroup)}
        animationType="slide"
        transparent
        onRequestClose={closeReinforceModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Tăng cường chuyến</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {reinforceGroup?.routeName || 'Chưa chọn tuyến'}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={closeReinforceModal}
              >
                <Ionicons name="close" size={22} color={APP_COLORS.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.fieldLabel}>Chuyến gốc</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceTripRow}
              >
                {reinforceGroup?.trips.map(trip => {
                  const selected = trip.id === reinforceSourceTrip?.id;
                  return (
                    <Pressable
                      key={trip.id}
                      style={[
                        styles.sourceTripChip,
                        selected && styles.sourceTripChipActive,
                      ]}
                      onPress={() => setReinforceSourceTripId(trip.id)}
                    >
                      <Text
                        style={[
                          styles.sourceTripTime,
                          selected && styles.sourceTripTextActive,
                        ]}
                      >
                        {formatTime(trip.departure_time)}
                      </Text>
                      <Text
                        style={[
                          styles.sourceTripName,
                          selected && styles.sourceTripTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {trip.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Giờ khởi hành *</Text>
              <View style={styles.dateTimePickerBox}>
                <View style={styles.dateTimeValueRow}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={ACTIVE_COLOR}
                  />
                  <Text style={styles.dateTimeValue}>
                    {reinforceDepartureTime}
                  </Text>
                </View>
                <View style={styles.dateTimeActions}>
                  <Pressable
                    style={styles.dateTimeButton}
                    onPress={() =>
                      setDateTimePicker({ field: 'departure', mode: 'date' })
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={ACTIVE_COLOR}
                    />
                    <Text style={styles.dateTimeButtonText}>Chọn ngày</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dateTimeButton}
                    onPress={() =>
                      setDateTimePicker({ field: 'departure', mode: 'time' })
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={ACTIVE_COLOR}
                    />
                    <Text style={styles.dateTimeButtonText}>Chọn giờ</Text>
                  </Pressable>
                </View>
                {dateTimePicker?.field === 'departure' ? (
                  <DateTimePicker
                    value={getDateFromDateTimeInput(reinforceDepartureTime)}
                    mode={dateTimePicker.mode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDeparturePickerChange}
                  />
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Giờ đến dự kiến</Text>
              <View style={styles.dateTimePickerBox}>
                <View style={styles.dateTimeValueRow}>
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={ACTIVE_COLOR}
                  />
                  <Text
                    style={[
                      styles.dateTimeValue,
                      !reinforceArrivalTime && styles.dateTimePlaceholder,
                    ]}
                  >
                    {reinforceArrivalTime || 'Để trống để backend tự tính'}
                  </Text>
                </View>
                <View style={styles.dateTimeActions}>
                  <Pressable
                    style={styles.dateTimeButton}
                    onPress={() =>
                      setDateTimePicker({ field: 'arrival', mode: 'date' })
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={ACTIVE_COLOR}
                    />
                    <Text style={styles.dateTimeButtonText}>Chọn ngày</Text>
                  </Pressable>
                  <Pressable
                    style={styles.dateTimeButton}
                    onPress={() =>
                      setDateTimePicker({ field: 'arrival', mode: 'time' })
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={ACTIVE_COLOR}
                    />
                    <Text style={styles.dateTimeButtonText}>Chọn giờ</Text>
                  </Pressable>
                  {reinforceArrivalTime ? (
                    <Pressable
                      style={styles.dateTimeClearButton}
                      onPress={() => {
                        setReinforceArrivalTime('');
                        setDateTimePicker(null);
                      }}
                    >
                      <Ionicons
                        name="close"
                        size={16}
                        color={APP_COLORS.danger}
                      />
                    </Pressable>
                  ) : null}
                </View>
                {dateTimePicker?.field === 'arrival' ? (
                  <DateTimePicker
                    value={getDateFromDateTimeInput(
                      reinforceArrivalTime || reinforceDepartureTime,
                    )}
                    mode={dateTimePicker.mode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDeparturePickerChange}
                  />
                ) : null}
              </View>

              <View style={styles.fieldGrid}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>ID xe</Text>
                  <TextInput
                    style={styles.textInput}
                    value={reinforceVehicleId}
                    onChangeText={setReinforceVehicleId}
                    placeholder="Dùng xe gốc"
                    placeholderTextColor={APP_COLORS.placeholder}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>ID tài xế</Text>
                  <TextInput
                    style={styles.textInput}
                    value={reinforceDriverId}
                    onChangeText={setReinforceDriverId}
                    placeholder="Dùng tài xế gốc"
                    placeholderTextColor={APP_COLORS.placeholder}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>ID phụ xe</Text>
              <TextInput
                style={styles.textInput}
                value={reinforceCoDriverId}
                onChangeText={setReinforceCoDriverId}
                placeholder="Để trống dùng chuyến gốc, nhập null để bỏ"
                placeholderTextColor={APP_COLORS.placeholder}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Trạng thái</Text>
              <View style={styles.segmented}>
                {(['confirmed', 'draft'] as const).map(state => (
                  <Pressable
                    key={state}
                    style={[
                      styles.segmentButton,
                      reinforceState === state && styles.segmentButtonActive,
                    ]}
                    onPress={() => setReinforceState(state)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        reinforceState === state && styles.segmentTextActive,
                      ]}
                    >
                      {state === 'confirmed' ? 'Confirmed' : 'Draft'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.textInput, styles.noteInput]}
                value={reinforceNote}
                onChangeText={setReinforceNote}
                placeholder="Chuyến tăng cường buổi sáng"
                placeholderTextColor={APP_COLORS.placeholder}
                multiline
              />

              {reinforceError ? (
                <View style={styles.formError}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={APP_COLORS.danger}
                  />
                  <Text style={styles.formErrorText}>{reinforceError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeReinforceModal}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  reinforceSubmitting && styles.buttonDisabled,
                ]}
                onPress={submitReinforceTrip}
                disabled={reinforceSubmitting}
              >
                {reinforceSubmitting ? (
                  <ActivityIndicator color={APP_COLORS.surface} />
                ) : (
                  <Text style={styles.submitButtonText}>Tạo chuyến</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  routeChevronButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  modalCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: APP_COLORS.surface,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  modalContent: {
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  sourceTripRow: {
    gap: 8,
    paddingBottom: 4,
  },
  sourceTripChip: {
    minWidth: 92,
    maxWidth: 136,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    backgroundColor: APP_COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sourceTripChipActive: {
    borderColor: ACTIVE_COLOR,
    backgroundColor: APP_COLORS.primaryLight,
  },
  sourceTripTime: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sourceTripName: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  sourceTripTextActive: {
    color: ACTIVE_COLOR,
  },
  textInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    backgroundColor: APP_COLORS.surface,
    paddingHorizontal: 12,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  dateTimePickerBox: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    backgroundColor: APP_COLORS.surface,
    padding: 10,
    gap: 10,
  },
  dateTimeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeValue: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dateTimePlaceholder: {
    color: APP_COLORS.placeholder,
    fontWeight: '500',
  },
  dateTimeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTimeButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 7,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dateTimeButtonText: {
    color: ACTIVE_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  dateTimeClearButton: {
    width: 38,
    minHeight: 38,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.dangerLight,
  },
  noteInput: {
    minHeight: 76,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.surface,
  },
  segmentButtonActive: {
    backgroundColor: APP_COLORS.primaryLight,
  },
  segmentText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: ACTIVE_COLOR,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: APP_COLORS.dangerLight,
    padding: 10,
  },
  formErrorText: {
    flex: 1,
    color: APP_COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  modalButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  cancelButtonText: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: ACTIVE_COLOR,
  },
  submitButtonText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
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
