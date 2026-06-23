import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { requestJson } from '../../services/apiClient';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type OdooRelation = false | [number, string];
type Trip = {
  id: number;
  name?: string;
  departure_time: string;
  available_seats: number;
  total_seats: number;
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
};
type TripsResponse = { results?: Trip[] };
type SeatsResponse = Seat[] | { results?: Seat[]; seats?: Seat[] };
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

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

export function AdminBookingScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [travelDate, setTravelDate] = useState(() => localDate(new Date()));
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripIndex, setActiveTripIndex] = useState(0);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const goToBooking = () => {
    if (!selectedTrip) return;
    navigation.navigate('TicketBooking', { initialTripId: selectedTrip.id, initialTravelDate: travelDate });
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
            <Text style={styles.moneyText}>Tổng tiền <Text style={styles.summaryValue}>0 đ</Text> • Đã thu <Text style={styles.summaryValue}>0 đ</Text></Text>
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={18} color={APP_COLORS.warning} />
              <Text style={styles.warningText}>Chưa gán thông tin BSX, tài/phụ</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.quickButton} onPress={goToBooking}>
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
              <Pressable key={seat.id} style={[styles.seat, { borderColor: seatColor(seat.state) }]} onPress={goToBooking}>
                <Text style={[styles.seatLabel, { color: seatColor(seat.state) }]}>{seat.name}</Text>
              </Pressable>
            ))}
            <View style={styles.driver}><Text style={styles.driverText}>GHẾ PHỤ</Text></View>
          </View>
        </> : null}
      </ScrollView>
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
  seat: { width: '30%', aspectRatio: 1, borderWidth: 2, borderRadius: 10, backgroundColor: APP_COLORS.surface, alignItems: 'center', justifyContent: 'center' }, seatLabel: { fontSize: 20, fontWeight: '800' },
});
