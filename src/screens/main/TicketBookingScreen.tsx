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
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useToast } from '../../components/Toast';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketBooking'>;
type IconName = ComponentProps<typeof Ionicons>['name'];
type OdooRelation = false | [number, string];

type OdooTripSummary = {
  id: number;
  name: string;
  state: string;
  departure_time: string;
  arrival_time?: string;
  price: number | string;
  total_seats: number;
  booked_seats: number;
  available_seats: number;
  route_id: OdooRelation;
  vehicle_id: OdooRelation;
  route?: {
    name?: string;
    origin?: string;
    destination?: string;
  };
  vehicle?: {
    license_plate?: string;
    name?: string;
    seat_layout?: string;
    floor_count?: number;
  };
};

type OdooSeat = {
  id: number;
  name: string;
  state: 'available' | 'booked' | 'occupied' | 'blocked' | string;
  ticket_id: false | number | [number, string];
  passenger_name: false | string;
  floor: number;
  row: number;
  col: number;
};

type OdooTripDetail = OdooTripSummary & {
  seats: OdooSeat[];
  driver?: {
    name?: string;
    phone?: string;
  } | null;
};

type TripsResponse = {
  results: OdooTripSummary[];
};

type OdooBookedTicket = {
  id: number;
  name: string;
  passenger_name: string;
  passenger_phone: string;
  price?: number | string;
  seat_id?: OdooRelation;
};

type OdooBookedSeat = {
  id: number;
  name: string;
};

type TicketBookingResponse = {
  tickets?: OdooBookedTicket[];
  ticket?: OdooBookedTicket;
  seats?: OdooBookedSeat[];
  seat?: OdooBookedSeat;
  total_tickets?: number;
};

const seatStateMeta: Record<
  string,
  { label: string; color: string; backgroundColor: string; icon: IconName }
> = {
  available: {
    label: 'Trống',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
    icon: 'checkmark-circle-outline',
  },
  booked: {
    label: 'Đã đặt',
    color: APP_COLORS.textSecondary,
    backgroundColor: APP_COLORS.background,
    icon: 'lock-closed-outline',
  },
  occupied: {
    label: 'Đã lên xe',
    color: APP_COLORS.info,
    backgroundColor: APP_COLORS.infoLight,
    icon: 'person-outline',
  },
  blocked: {
    label: 'Khóa',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
    icon: 'ban-outline',
  },
};

const MAX_SEATS_PER_BOOKING = 20;

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function parseOdooDateTime(value: string) {
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: string) {
  const date = parseOdooDateTime(value);
  if (!date) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value: string) {
  const date = parseOdooDateTime(value);
  if (!date) {
    return value;
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount) || amount <= 0) {
    return 'Theo chuyến';
  }

  return amount.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
}

function relationName(value: OdooRelation | undefined) {
  return Array.isArray(value) ? value[1] : 'Chưa cập nhật';
}

function getRouteName(trip: OdooTripSummary) {
  if (trip.route?.origin && trip.route?.destination) {
    return `${trip.route.origin} - ${trip.route.destination}`;
  }

  return trip.route?.name || relationName(trip.route_id);
}

function getVehicleName(trip: OdooTripSummary) {
  return (
    trip.vehicle?.license_plate ||
    trip.vehicle?.name ||
    relationName(trip.vehicle_id)
  );
}

function getAutoPassengerName(phone: string) {
  const trimmedPhone = phone.trim();
  return trimmedPhone ? `Khach ${trimmedPhone}` : 'Khach le';
}

export function TicketBookingScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const initialPhone = route.params?.initialPhone || '';
  const initialPassengerName = route.params?.initialPassengerName || '';
  const initialTripId = route.params?.initialTripId;
  const initialTravelDate = route.params?.initialTravelDate;
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const tomorrow = useMemo(() => formatLocalDate(addDays(new Date(), 1)), []);

  const [travelDate, setTravelDate] = useState(initialTravelDate || today);
  const [trips, setTrips] = useState<OdooTripSummary[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<OdooTripSummary | null>(
    null,
  );
  const [tripDetail, setTripDetail] = useState<OdooTripDetail | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<OdooSeat[]>([]);
  const [passengerName, setPassengerName] = useState(initialPassengerName);
  const [passengerPhone, setPassengerPhone] = useState(initialPhone);
  const [passengerIdNumber, setPassengerIdNumber] = useState('');
  const [note, setNote] = useState('Khach goi tong dai');
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(false);
  const [autoSelectedTripId, setAutoSelectedTripId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchTrips = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setLoadingTrips(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams({
          date_from: travelDate,
          date_to: travelDate,
          states: 'draft,confirmed',
          limit: '100',
        });
        const data = await requestJson<TripsResponse>(
          `/api/nhaxe/odoo/trips/?${params.toString()}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'odoo-trips',
          },
        );

        setTrips(data.results || []);
        setSelectedTrip(current => {
          if (!current) {
            return null;
          }

          return data.results.find(item => item.id === current.id) || null;
        });
      } catch (tripsError) {
        const message =
          tripsError instanceof Error
            ? tripsError.message
            : 'Không tải được danh sách chuyến.';
        setError(message);
      } finally {
        setLoadingTrips(false);
        setRefreshing(false);
      }
    },
    [travelDate],
  );

  const fetchTripDetail = useCallback(async (trip: OdooTripSummary) => {
    setLoadingDetail(true);
    setDetailError(null);
    setSelectedSeats([]);

    try {
      const data = await requestJson<OdooTripDetail>(
        `/api/nhaxe/odoo/trips/${trip.id}/`,
        {
          method: 'GET',
          auth: true,
          logLabel: 'odoo-trip-detail',
        },
      );
      setTripDetail(data);
    } catch (tripError) {
      const message =
        tripError instanceof Error
          ? tripError.message
          : 'Không tải được sơ đồ ghế.';
      setTripDetail(null);
      setDetailError(message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchInitialTripDetail = useCallback(async (tripId: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    setSelectedSeats([]);

    try {
      const data = await requestJson<OdooTripDetail>(
        `/api/nhaxe/odoo/trips/${tripId}/`,
        {
          method: 'GET',
          auth: true,
          logLabel: 'odoo-initial-trip-detail',
        },
      );
      setSelectedTrip(data);
      setTripDetail(data);
      setAutoSelectedTripId(tripId);
    } catch (tripError) {
      const message =
        tripError instanceof Error
          ? tripError.message
          : 'Không tải được sơ đồ ghế.';
      setDetailError(message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips('initial');
  }, [fetchTrips]);

  useEffect(() => {
    if (!initialTripId || autoSelectedTripId === initialTripId) {
      return;
    }

    const initialTrip = trips.find(trip => trip.id === initialTripId);
    if (!initialTrip) {
      return;
    }

    setAutoSelectedTripId(initialTripId);
    setSelectedTrip(initialTrip);
    fetchTripDetail(initialTrip);
  }, [autoSelectedTripId, fetchTripDetail, initialTripId, trips]);

  useEffect(() => {
    if (
      !initialTripId ||
      loadingTrips ||
      autoSelectedTripId === initialTripId ||
      trips.some(trip => trip.id === initialTripId)
    ) {
      return;
    }

    fetchInitialTripDetail(initialTripId);
  }, [
    autoSelectedTripId,
    fetchInitialTripDetail,
    initialTripId,
    loadingTrips,
    trips,
  ]);

  const selectTrip = (trip: OdooTripSummary) => {
    setSelectedTrip(trip);
    fetchTripDetail(trip);
  };

  const changeTravelDate = (value: string) => {
    setTravelDate(value);
    setSelectedTrip(null);
    setTripDetail(null);
    setSelectedSeats([]);
    setDetailError(null);
  };

  const onRefresh = async () => {
    await fetchTrips('refresh');
    if (selectedTrip) {
      await fetchTripDetail(selectedTrip);
    }
  };

  const sortedSeats = useMemo(() => {
    return [...(tripDetail?.seats || [])].sort((a, b) => {
      if (a.floor !== b.floor) {
        return a.floor - b.floor;
      }
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.col - b.col;
    });
  }, [tripDetail]);

  const floors = useMemo(() => {
    const floorMap = new Map<number, OdooSeat[]>();
    sortedSeats.forEach(seat => {
      const seats = floorMap.get(seat.floor) || [];
      seats.push(seat);
      floorMap.set(seat.floor, seats);
    });

    return Array.from(floorMap.entries()).sort(([floorA], [floorB]) => {
      return floorA - floorB;
    });
  }, [sortedSeats]);

  const selectedTripForSummary = tripDetail || selectedTrip;
  const selectedSeatNames = selectedSeats.map(seat => seat.name).join(', ');
  const canBook = Boolean(
    selectedTripForSummary && selectedSeats.length > 0 && !booking,
  );

  const toggleSeat = (seat: OdooSeat) => {
    setSelectedSeats(current => {
      if (current.some(item => item.id === seat.id)) {
        return current.filter(item => item.id !== seat.id);
      }

      if (current.length >= MAX_SEATS_PER_BOOKING) {
        setDetailError(`Chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế/lần.`);
        return current;
      }

      setDetailError(null);
      return [...current, seat].sort((a, b) => {
        if (a.floor !== b.floor) {
          return a.floor - b.floor;
        }
        if (a.row !== b.row) {
          return a.row - b.row;
        }
        return a.col - b.col;
      });
    });
  };

  const submitBooking = async () => {
    if (!selectedTripForSummary || selectedSeats.length === 0) {
      setDetailError('Vui lòng chọn chuyến và ít nhất một ghế trống.');
      return;
    }

    setBooking(true);
    setDetailError(null);

    try {
      const passengerId = passengerIdNumber.trim();
      const payload = {
        trip_id: selectedTripForSummary.id,
        ...(selectedSeats.length === 1
          ? { seat_id: selectedSeats[0].id }
          : { seat_ids: selectedSeats.map(seat => seat.id) }),
        passenger_name:
          passengerName.trim() || getAutoPassengerName(passengerPhone),
        passenger_phone: passengerPhone.trim(),
        ...(passengerId ? { passenger_id_number: passengerId } : {}),
        create_partner: true,
        note: note.trim(),
      };
      const data = await requestJson<TicketBookingResponse>(
        '/api/nhaxe/odoo/book-ticket/',
        {
          method: 'POST',
          auth: true,
          body: payload,
          logLabel: 'odoo-book-ticket',
        },
      );
      const bookedTickets = data.tickets || (data.ticket ? [data.ticket] : []);

      showToast({
        type: 'success',
        title: 'Đặt vé thành công',
        message:
          bookedTickets.length > 0
            ? bookedTickets
                .map(ticket => {
                  const seatName = relationName(ticket.seat_id);
                  return `${ticket.name}${seatName !== 'Chưa cập nhật' ? ` - ghế ${seatName}` : ''}`;
                })
                .join('\n')
            : `Đã đặt ${data.total_tickets || selectedSeats.length} vé.`,
      });
      setSelectedSeats([]);
      await fetchTripDetail(selectedTripForSummary);
      await fetchTrips('refresh');
    } catch (bookingError) {
      const message =
        bookingError instanceof Error
          ? bookingError.message
          : 'Không đặt được đủ vé. Vui lòng thử lại.';
      setDetailError(message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <ScreenContainer
      title="Đặt vé"
      subtitle="Chọn chuyến, chọn ghế, xác nhận nhanh"
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primaryDark}
          />
        }
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ngày đi</Text>
          <View style={styles.dateQuickRow}>
            <DateChip
              label="Hôm nay"
              active={travelDate === today}
              onPress={() => changeTravelDate(today)}
            />
            <DateChip
              label="Ngày mai"
              active={travelDate === tomorrow}
              onPress={() => changeTravelDate(tomorrow)}
            />
          </View>
          <View style={styles.dateInputRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={APP_COLORS.primaryDark}
            />
            <TextInput
              value={travelDate}
              onChangeText={changeTravelDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.dateInput}
            />
            <Pressable style={styles.smallButton} onPress={() => fetchTrips()}>
              <Ionicons
                name="search-outline"
                size={16}
                color={APP_COLORS.surface}
              />
            </Pressable>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chuyến đi</Text>
            {loadingTrips ? (
              <ActivityIndicator color={APP_COLORS.primaryDark} size="small" />
            ) : (
              <Text style={styles.countText}>{trips.length} chuyến</Text>
            )}
          </View>

          {!loadingTrips && trips.length === 0 ? (
            <Text style={styles.emptyText}>Không có chuyến trong ngày này.</Text>
          ) : null}

          {trips.map(trip => (
            <Pressable
              key={trip.id}
              style={[
                styles.tripCard,
                selectedTrip?.id === trip.id && styles.tripCardActive,
              ]}
              onPress={() => selectTrip(trip)}
            >
              <View style={styles.tripTopRow}>
                <Text style={styles.tripRoute}>{getRouteName(trip)}</Text>
                <Text style={styles.tripPrice}>{formatMoney(trip.price)}</Text>
              </View>
              <View style={styles.tripMetaRow}>
                <TripMeta
                  icon="time-outline"
                  text={formatDateTime(trip.departure_time)}
                />
                <TripMeta icon="bus-outline" text={getVehicleName(trip)} />
              </View>
              <View style={styles.tripBottomRow}>
                <Text style={styles.tripSeatText}>
                  Còn {trip.available_seats}/{trip.total_seats} ghế
                </Text>
                {trip.arrival_time ? (
                  <Text style={styles.tripSeatText}>
                    Đến {formatTime(trip.arrival_time)}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sơ đồ ghế</Text>
            {loadingDetail ? (
              <ActivityIndicator color={APP_COLORS.primaryDark} size="small" />
            ) : null}
          </View>

          {!selectedTrip ? (
            <Text style={styles.emptyText}>Chọn một chuyến để xem ghế.</Text>
          ) : null}

          {selectedTripForSummary && !loadingDetail ? (
            <View style={styles.tripSummary}>
              <Text style={styles.summaryTitle}>
                {getRouteName(selectedTripForSummary)}
              </Text>
              <Text style={styles.summaryMeta}>
                {formatDateTime(selectedTripForSummary.departure_time)} -{' '}
                {getVehicleName(selectedTripForSummary)}
              </Text>
              <Text style={styles.summaryMeta}>
                Còn {selectedTripForSummary.available_seats} ghế trống
              </Text>
            </View>
          ) : null}

          {detailError ? (
            <Text style={styles.errorText}>{detailError}</Text>
          ) : null}

          {floors.map(([floor, seats]) => (
            <SeatFloor
              key={floor}
              floor={floor}
              seats={seats}
              selectedSeatIds={selectedSeats.map(seat => seat.id)}
              onSelect={toggleSeat}
            />
          ))}

          {tripDetail ? (
            <View style={styles.legendRow}>
              <SeatLegend state="available" />
              <SeatLegend state="booked" />
              <SeatLegend state="occupied" />
              <SeatLegend state="blocked" />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin khách</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên khách</Text>
            <TextInput
              value={passengerName}
              onChangeText={setPassengerName}
              placeholder={getAutoPassengerName(passengerPhone)}
              placeholderTextColor={APP_COLORS.placeholder}
              style={styles.input}
            />
          </View>
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                value={passengerPhone}
                onChangeText={setPassengerPhone}
                placeholder="0909000000"
                placeholderTextColor={APP_COLORS.placeholder}
                style={styles.input}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>CCCD</Text>
              <TextInput
                value={passengerIdNumber}
                onChangeText={setPassengerIdNumber}
                placeholder="Bỏ trống"
                placeholderTextColor={APP_COLORS.placeholder}
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ghi chú</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Khach goi tong dai"
              placeholderTextColor={APP_COLORS.placeholder}
              style={[styles.input, styles.noteInput]}
              multiline
            />
          </View>

          <View style={styles.selectedBox}>
            <Text style={styles.selectedText}>
              {selectedSeats.length > 0
                ? `Ghế đang chọn (${selectedSeats.length}): ${selectedSeatNames}`
                : 'Chưa chọn ghế'}
            </Text>
            <Text style={styles.selectedSubText}>
              {selectedTripForSummary
                ? `${getRouteName(selectedTripForSummary)} - ${formatMoney(
                    selectedTripForSummary.price,
                  )}`
                : 'Chọn chuyến để tiếp tục'}
            </Text>
          </View>

          <Pressable
            style={[styles.primaryButton, !canBook && styles.disabledButton]}
            disabled={!canBook}
            onPress={submitBooking}
          >
            <View style={styles.buttonContent}>
              {booking ? (
                <ActivityIndicator color={APP_COLORS.surface} size="small" />
              ) : (
                <Ionicons
                  name="ticket-outline"
                  size={16}
                  color={APP_COLORS.surface}
                />
              )}
              <Text style={styles.primaryButtonText}>
                {booking
                  ? 'Đang đặt vé...'
                  : `Xác nhận ${selectedSeats.length || ''} vé`.trim()}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DateChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.dateChip, active && styles.dateChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TripMeta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.tripMeta}>
      <Ionicons name={icon} size={13} color={APP_COLORS.textSecondary} />
      <Text style={styles.tripMetaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function SeatFloor({
  floor,
  seats,
  selectedSeatIds,
  onSelect,
}: {
  floor: number;
  seats: OdooSeat[];
  selectedSeatIds: number[];
  onSelect: (seat: OdooSeat) => void;
}) {
  const rows = Array.from(new Set(seats.map(seat => seat.row))).sort(
    (a, b) => a - b,
  );
  const maxCol = Math.max(...seats.map(seat => seat.col), 1);

  return (
    <View style={styles.floorBlock}>
      <Text style={styles.floorTitle}>Tầng {floor}</Text>
      {rows.map(row => (
        <View key={`${floor}-${row}`} style={styles.seatRow}>
          {Array.from({ length: maxCol }, (_, index) => index + 1).map(col => {
            const seat = seats.find(item => item.row === row && item.col === col);
            if (!seat) {
              return <View key={`${floor}-${row}-${col}`} style={styles.seatGap} />;
            }

            const selectable = seat.state === 'available';
            const selected = selectedSeatIds.includes(seat.id);
            const meta = seatStateMeta[seat.state] || seatStateMeta.blocked;

            return (
              <Pressable
                key={seat.id}
                disabled={!selectable}
                style={[
                  styles.seatButton,
                  {
                    backgroundColor: meta.backgroundColor,
                    borderColor: meta.color,
                  },
                  !selectable && styles.seatDisabled,
                  selected && styles.seatSelected,
                ]}
                onPress={() => onSelect(seat)}
              >
                <Ionicons
                  name={selected ? 'checkmark-circle' : meta.icon}
                  size={14}
                  color={selected ? APP_COLORS.surface : meta.color}
                />
                <Text
                  style={[
                    styles.seatText,
                    { color: selected ? APP_COLORS.surface : meta.color },
                  ]}
                  numberOfLines={1}
                >
                  {seat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SeatLegend({ state }: { state: string }) {
  const meta = seatStateMeta[state];

  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: meta.backgroundColor, borderColor: meta.color },
        ]}
      />
      <Text style={styles.legendText}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  countText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  dateQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: APP_COLORS.primaryDark,
    borderColor: APP_COLORS.primaryDark,
  },
  dateChipText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  dateChipTextActive: {
    color: APP_COLORS.surface,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    paddingLeft: 10,
    backgroundColor: APP_COLORS.background,
  },
  dateInput: {
    flex: 1,
    minHeight: 42,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  smallButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: APP_COLORS.primaryDark,
  },
  tripCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: APP_COLORS.background,
    marginBottom: 8,
  },
  tripCardActive: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryLight,
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  tripRoute: {
    flex: 1,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  tripPrice: {
    color: APP_COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  tripMetaRow: {
    marginTop: 8,
    gap: 6,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tripMetaText: {
    flex: 1,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tripBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tripSeatText: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tripSummary: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.primaryLight,
    marginBottom: 10,
  },
  summaryTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryMeta: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  floorBlock: {
    marginTop: 8,
    gap: 7,
  },
  floorTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  seatRow: {
    flexDirection: 'row',
    gap: 7,
  },
  seatButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  seatGap: {
    flex: 1,
    minHeight: 46,
  },
  seatDisabled: {
    opacity: 0.72,
  },
  seatSelected: {
    borderColor: APP_COLORS.primaryDark,
    backgroundColor: APP_COLORS.primaryDark,
  },
  seatText: {
    fontSize: 11,
    fontWeight: '800',
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
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
    backgroundColor: APP_COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: APP_COLORS.textPrimary,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  selectedBox: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: APP_COLORS.background,
    marginBottom: 10,
  },
  selectedText: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedSubText: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 44,
    backgroundColor: APP_COLORS.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonContent: {
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
  emptyText: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  errorText: {
    marginTop: 8,
    color: APP_COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
