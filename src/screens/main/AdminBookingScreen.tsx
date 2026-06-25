import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { AppTextInput as TextInput } from '../../components/AppTextInput';
import { useToast } from '../../components/Toast';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';

type OdooRelation = false | [number, string];
type Trip = {
  id: number;
  name?: string;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  price?: number | string;
  default_price?: number | string;
  min_seat_price?: number | string;
  max_seat_price?: number | string;
  route_id?: OdooRelation;
  vehicle?: { license_plate?: string; name?: string };
  route?: { name?: string; origin?: string; destination?: string };
};
type Seat = {
  id: number;
  name: string;
  state: 'available' | 'booked' | 'occupied' | 'blocked' | string;
  row: number;
  col: number;
  effective_price?: number | string;
  price?: number | string;
};
type TripsResponse = { results?: Trip[] };
type SeatsResponse = Seat[] | { results?: Seat[]; seats?: Seat[] };
type BookingResponse = { total_tickets?: number; tickets?: { name?: string }[] };

function localDate(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

function formatTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '--:--' : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function routeName(trip: Trip) {
  if (trip.route?.origin && trip.route?.destination) {
    return `${trip.route.origin} - ${trip.route.destination}`;
  }
  if (trip.route?.name) {
    return trip.route.name;
  }
  return Array.isArray(trip.route_id) ? trip.route_id[1] : trip.name || 'Chưa có tuyến';
}

function normalizeSeats(data: SeatsResponse): Seat[] {
  return Array.isArray(data) ? data : data.results || data.seats || [];
}

function seatColor(state: Seat['state']) {
  if (state === 'available') return APP_COLORS.success;
  if (state === 'blocked') return APP_COLORS.danger;
  if (state === 'booked' || state === 'occupied') return APP_COLORS.textSecondary;
  return APP_COLORS.placeholder;
}

function ticketPrice(seat: Seat, trip?: Trip | null) {
  const value = Number(seat.effective_price ?? seat.price ?? trip?.default_price ?? trip?.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value || 0);
  return amount > 0
    ? amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    : 'Chưa cập nhật';
}

function tripPriceLabel(trip: Trip) {
  const min = Number(trip.min_seat_price ?? trip.default_price ?? trip.price ?? 0);
  const max = Number(trip.max_seat_price ?? trip.default_price ?? trip.price ?? 0);
  return min > 0 && max > min ? `${formatMoney(min)} – ${formatMoney(max)}` : formatMoney(min);
}

export function AdminBookingScreen() {
  const { showToast } = useToast();
  const [travelDate, setTravelDate] = useState(() => localDate(new Date()));
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingVisible, setBookingVisible] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [note, setNote] = useState('Khách đặt tại quầy');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const selectedTrip = trips[activeTripIndex] || null;
  const selectedTripId = selectedTrip?.id;
  const fetchTrips = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await requestJson<TripsResponse>(
        `/api/nhaxe/odoo/trips/?date_from=${travelDate}&date_to=${travelDate}&states=draft,confirmed&limit=100`,
        { method: 'GET', auth: true, logLabel: 'admin-booking-trips' },
      );
      setTrips(data.results || []);
      setActiveTripIndex(0);
    } catch (requestError) {
      setTrips([]);
      setError(requestError instanceof Error ? requestError.message : 'Không tải được chuyến xe.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [travelDate]);

  const fetchSeats = useCallback(async (tripId: number) => {
    try {
      const data = await requestJson<SeatsResponse>(
        `/api/nhaxe/odoo/trips/${tripId}/seats/`,
        { method: 'GET', auth: true, logLabel: 'admin-booking-seats' },
      );
      setSeats(normalizeSeats(data));
    } catch (requestError) {
      setSeats([]);
      setError(requestError instanceof Error ? requestError.message : 'Không tải được sơ đồ ghế.');
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => {
    if (selectedTripId) {
      fetchSeats(selectedTripId);
    } else {
      setSeats([]);
    }
  }, [fetchSeats, selectedTripId]);

  const stats = useMemo(() => ({
    booked: seats.filter(seat => seat.state === 'booked' || seat.state === 'occupied').length,
    available: seats.filter(seat => seat.state === 'available').length,
    blocked: seats.filter(seat => seat.state === 'blocked').length,
  }), [seats]);

  const sortedSeats = useMemo(() => [...seats].sort((a, b) => a.row - b.row || a.col - b.col), [seats]);
  const selectedBookingSeats = useMemo(
    () => seats.filter(seat => selectedSeatIds.includes(seat.id)),
    [seats, selectedSeatIds],
  );
  const selectedTotal = useMemo(
    () => selectedBookingSeats.reduce((total, seat) => total + ticketPrice(seat, selectedTrip), 0),
    [selectedBookingSeats, selectedTrip],
  );
  const openBooking = (seat?: Seat) => {
    if (!selectedTrip) return;
    setBookingError(null);
    setSelectedSeatIds(seat?.state === 'available' ? [seat.id] : []);
    setBookingVisible(true);
  };
  const toggleBookingSeat = (seat: Seat) => {
    if (seat.state !== 'available') return;
    setSelectedSeatIds(current => current.includes(seat.id) ? current.filter(id => id !== seat.id) : [...current, seat.id]);
  };
  const submitBooking = async () => {
    if (!selectedTrip || selectedSeatIds.length === 0) {
      setBookingError('Vui lòng chọn ít nhất một ghế trống.');
      return;
    }
    setBooking(true);
    setBookingError(null);
    try {
      const data = await requestJson<BookingResponse>('/api/nhaxe/odoo/book-ticket/', {
        method: 'POST', auth: true,
        body: {
          trip_id: selectedTrip.id,
          ...(selectedSeatIds.length === 1 ? { seat_id: selectedSeatIds[0] } : { seat_ids: selectedSeatIds }),
          passenger_name: passengerName.trim() || 'Khách lẻ',
          passenger_phone: passengerPhone.trim(),
          create_partner: true,
          note: note.trim(),
        },
        logLabel: 'admin-book-ticket',
      });
      setBookingVisible(false);
      setSelectedSeatIds([]);
      showToast({ type: 'success', title: 'Đặt vé thành công', message: `Đã đặt ${data.total_tickets || selectedBookingSeats.length} vé.` });
      await Promise.all([fetchSeats(selectedTrip.id), fetchTrips(true)]);
    } catch (requestError) {
      setBookingError(requestError instanceof Error ? requestError.message : 'Không thể đặt vé. Vui lòng thử lại.');
    } finally {
      setBooking(false);
    }
  };
  const changeTrip = (direction: number) => {
    if (!trips.length) return;
    setActiveTripIndex(index => (index + direction + trips.length) % trips.length);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTrips(true)} tintColor={APP_COLORS.primaryDark} />}
      >
        <View style={styles.tripPanel}>
          <Text style={styles.routeText}>{selectedTrip ? routeName(selectedTrip) : 'Chọn chuyến để đặt vé'}</Text>
          <View style={styles.dateRow}>
            <Pressable onPress={() => setTravelDate(value => addDays(value, -1))} style={styles.dateArrow}>
              <Ionicons name="chevron-back" size={28} color={APP_COLORS.primaryDark} />
            </Pressable>
            <Text style={styles.dateText}>{formatDate(travelDate)}</Text>
            <Pressable onPress={() => setTravelDate(value => addDays(value, 1))} style={styles.dateArrow}>
              <Ionicons name="chevron-forward" size={28} color={APP_COLORS.primaryDark} />
            </Pressable>
            <View style={styles.timeBox}><Text style={styles.timeText}>{selectedTrip ? formatTime(selectedTrip.departure_time) : '--:--'}</Text></View>
          </View>
        </View>

        {loading ? <ActivityIndicator size="large" color={APP_COLORS.primaryDark} style={styles.loader} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && !selectedTrip ? <Text style={styles.emptyText}>Không có chuyến chạy trong ngày này.</Text> : null}

        {selectedTrip ? <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryText}>Tổng vé đặt <Text style={styles.summaryValue}>{stats.booked}</Text></Text>
              <Text style={styles.summaryText}>○ Trống <Text style={styles.summaryValue}>{stats.available}</Text></Text>
              <Text style={styles.summaryText}>● Khóa <Text style={styles.summaryValue}>{stats.blocked}</Text></Text>
            </View>
            <Text style={styles.moneyText}>Giá vé <Text style={styles.summaryValue}>{tripPriceLabel(selectedTrip)}</Text></Text>
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={18} color={APP_COLORS.warning} />
              <Text style={styles.warningText}>Chưa gán thông tin BSX, tài/phụ</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.quickButton} onPress={() => openBooking()}>
              <Ionicons name="add" size={25} color={APP_COLORS.surface} />
              <Text style={styles.quickButtonText}>Đặt vé nhanh</Text>
            </Pressable>
            <View style={styles.viewButtons}>
              <View style={[styles.viewButton, styles.viewButtonActive]}><Ionicons name="grid" size={23} color={APP_COLORS.primaryDark} /></View>
              <View style={styles.viewButton}><Ionicons name="grid-outline" size={23} color={APP_COLORS.placeholder} /></View>
              <View style={styles.viewButton}><Ionicons name="list-outline" size={23} color={APP_COLORS.placeholder} /></View>
              <Pressable style={[styles.viewButton, styles.refreshButton]} onPress={() => fetchSeats(selectedTrip.id)}><Ionicons name="refresh" size={23} color={APP_COLORS.surface} /></Pressable>
            </View>
          </View>

          <View style={styles.vehicleBar}>
            <Pressable onPress={() => changeTrip(-1)} hitSlop={8}><Ionicons name="chevron-back" size={21} color={APP_COLORS.primaryDark} /></Pressable>
            <Text style={styles.vehicleText} numberOfLines={1}>{selectedTrip.vehicle?.license_plate || selectedTrip.vehicle?.name || `Chuyến ${activeTripIndex + 1}/${trips.length}`}</Text>
            <Pressable onPress={() => changeTrip(1)} hitSlop={8}><Ionicons name="chevron-forward" size={21} color={APP_COLORS.primaryDark} /></Pressable>
          </View>

          <View style={styles.seatMap}>
            <View style={styles.driver}><Text style={styles.driverText}>TÀI XẾ</Text></View>
            {sortedSeats.map(seat => (
              <Pressable key={seat.id} style={[styles.seat, { borderColor: seatColor(seat.state) }]} onPress={() => openBooking(seat)}>
                <Text style={[styles.seatLabel, { color: seatColor(seat.state) }]}>{seat.name}</Text>
                <Text style={styles.seatPrice}>{formatMoney(ticketPrice(seat, selectedTrip))}</Text>
              </Pressable>
            ))}
            <View style={styles.driver}><Text style={styles.driverText}>GHẾ PHỤ</Text></View>
          </View>
        </> : null}
      </ScrollView>
      <Modal visible={bookingVisible} transparent animationType="slide" onRequestClose={() => setBookingVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => !booking && setBookingVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Đặt vé tại quầy</Text><Text style={styles.modalSubTitle}>{selectedTrip ? `${routeName(selectedTrip)} · ${formatTime(selectedTrip.departure_time)}` : ''}</Text></View>
              <Pressable onPress={() => setBookingVisible(false)} hitSlop={10}><Ionicons name="close" size={26} color={APP_COLORS.textPrimary} /></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Chọn ghế trống</Text>
              <View style={styles.modalSeats}>
                {sortedSeats.filter(seat => seat.state === 'available').map(seat => {
                  const selected = selectedSeatIds.includes(seat.id);
                  return <Pressable key={seat.id} onPress={() => toggleBookingSeat(seat)} style={[styles.modalSeat, selected && styles.modalSeatSelected]}><Text style={[styles.modalSeatName, selected && styles.modalSeatTextSelected]}>{seat.name}</Text><Text style={[styles.modalSeatPrice, selected && styles.modalSeatTextSelected]}>{formatMoney(ticketPrice(seat, selectedTrip))}</Text></Pressable>;
                })}
              </View>
              <Text style={styles.modalLabel}>Thông tin khách</Text>
              <TextInput value={passengerName} onChangeText={setPassengerName} placeholder="Tên khách (có thể bỏ trống)" placeholderTextColor={APP_COLORS.placeholder} style={styles.input} />
              <TextInput value={passengerPhone} onChangeText={setPassengerPhone} placeholder="Số điện thoại" placeholderTextColor={APP_COLORS.placeholder} keyboardType="phone-pad" style={styles.input} />
              <TextInput value={note} onChangeText={setNote} placeholder="Ghi chú" placeholderTextColor={APP_COLORS.placeholder} style={[styles.input, styles.noteInput]} multiline />
              {bookingError ? <Text style={styles.bookingError}>{bookingError}</Text> : null}
            </ScrollView>
            <View style={styles.modalFooter}><View><Text style={styles.footerSeats}>{selectedBookingSeats.length ? `Ghế: ${selectedBookingSeats.map(seat => seat.name).join(', ')}` : 'Chưa chọn ghế'}</Text><Text style={styles.footerTotal}>Tổng tiền: {formatMoney(selectedTotal)}</Text></View><Pressable disabled={booking || !selectedSeatIds.length} onPress={submitBooking} style={[styles.confirmButton, (booking || !selectedSeatIds.length) && styles.disabledButton]}>{booking ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text style={styles.confirmButtonText}>Xác nhận</Text>}</Pressable></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  content: { padding: 16, paddingBottom: 24 },
  tripPanel: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 14, overflow: 'hidden', backgroundColor: APP_COLORS.surface },
  routeText: { paddingHorizontal: 18, paddingVertical: 20, color: APP_COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  dateRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: APP_COLORS.border },
  dateArrow: { width: 54, alignItems: 'center', justifyContent: 'center' },
  dateText: { flex: 1, color: APP_COLORS.textPrimary, fontSize: 18, textAlign: 'center' },
  timeBox: { minWidth: 84, alignSelf: 'stretch', paddingHorizontal: 12, borderLeftWidth: 1, borderLeftColor: APP_COLORS.border, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: APP_COLORS.textPrimary, fontSize: 17, fontWeight: '600' },
  loader: { marginTop: 36 }, errorText: { marginTop: 16, color: APP_COLORS.danger, textAlign: 'center' }, emptyText: { marginTop: 28, color: APP_COLORS.textSecondary, textAlign: 'center' },
  summaryCard: { marginTop: 16, borderRadius: 14, padding: 15, backgroundColor: APP_COLORS.primaryLight },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, summaryText: { color: APP_COLORS.textSecondary, fontSize: 13 }, summaryValue: { color: APP_COLORS.textPrimary, fontWeight: '700' },
  moneyText: { marginTop: 10, color: APP_COLORS.textPrimary, fontSize: 15 }, warningRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7 }, warningText: { color: APP_COLORS.primaryDark, fontSize: 14, fontWeight: '600' },
  actionRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickButton: { minHeight: 48, borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: APP_COLORS.primaryDark }, quickButtonText: { color: APP_COLORS.surface, fontSize: 16, fontWeight: '700' },
  viewButtons: { flexDirection: 'row', gap: 7 }, viewButton: { width: 39, height: 39, borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.surface }, viewButtonActive: { backgroundColor: APP_COLORS.primaryLight }, refreshButton: { backgroundColor: APP_COLORS.primaryDark, borderColor: APP_COLORS.primaryDark },
  vehicleBar: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, vehicleText: { flex: 1, marginHorizontal: 10, color: APP_COLORS.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  seatMap: { marginTop: 12, alignSelf: 'center', width: '84%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  driver: { width: '30%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#d8e4e3', alignItems: 'center', justifyContent: 'center' }, driverText: { color: APP_COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  seat: { width: '30%', aspectRatio: 1, borderWidth: 2, borderRadius: 10, backgroundColor: APP_COLORS.surface, alignItems: 'center', justifyContent: 'center' }, seatLabel: { fontSize: 20, fontWeight: '800' }, seatPrice: { marginTop: 3, fontSize: 10, color: APP_COLORS.textSecondary, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' }, modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, modalCard: { maxHeight: '88%', padding: 20, paddingBottom: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: APP_COLORS.surface }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }, modalTitle: { color: APP_COLORS.textPrimary, fontSize: 21, fontWeight: '800' }, modalSubTitle: { marginTop: 4, color: APP_COLORS.textSecondary, fontSize: 13 }, modalLabel: { marginBottom: 9, color: APP_COLORS.textPrimary, fontSize: 15, fontWeight: '700' }, modalSeats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }, modalSeat: { width: '31%', minHeight: 56, padding: 6, borderRadius: 9, borderWidth: 1, borderColor: APP_COLORS.success, justifyContent: 'center', alignItems: 'center' }, modalSeatSelected: { backgroundColor: APP_COLORS.primaryDark, borderColor: APP_COLORS.primaryDark }, modalSeatName: { color: APP_COLORS.success, fontWeight: '800' }, modalSeatPrice: { marginTop: 2, color: APP_COLORS.textSecondary, fontSize: 10 }, modalSeatTextSelected: { color: APP_COLORS.surface }, input: { minHeight: 48, marginBottom: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, color: APP_COLORS.textPrimary, backgroundColor: APP_COLORS.background }, noteInput: { minHeight: 70, paddingTop: 12, textAlignVertical: 'top' }, bookingError: { marginBottom: 8, color: APP_COLORS.danger, fontSize: 13 }, modalFooter: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: APP_COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, footerSeats: { maxWidth: 190, color: APP_COLORS.textSecondary, fontSize: 12 }, footerTotal: { marginTop: 4, color: APP_COLORS.textPrimary, fontSize: 15, fontWeight: '800' }, confirmButton: { minWidth: 106, minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: APP_COLORS.primaryDark }, confirmButtonText: { color: APP_COLORS.surface, fontWeight: '800' }, disabledButton: { opacity: 0.5 },
});
