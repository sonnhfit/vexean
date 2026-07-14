import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import { requestJson } from '../../services/apiClient';

const formatTripPrice = (price: number) => `${price.toLocaleString('vi-VN')}đ`;
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketSearchResults'>;
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
    vehicle_type?: string;
    capacity?: number;
    floor_count?: number;
    seat_layout?: string;
  };
  driver?: {
    id?: number;
    name?: string;
    phone?: string;
  } | null;
};

type TripsResponse = {
  results: OdooTripSummary[];
};

type SearchTrip = {
  id: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  origin: string;
  destination: string;
  operator: string;
  vehicleType: string;
  price: number;
  seatsLeft: number;
  color: string;
};

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
    return value || '--:--';
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHeaderDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDuration(departureTime: string, arrivalTime?: string, fallbackHours?: number) {
  const departure = parseOdooDateTime(departureTime);
  const arrival = parseOdooDateTime(arrivalTime);
  if (departure && arrival) {
    const diffMinutes = Math.max(
      0,
      Math.round((arrival.getTime() - departure.getTime()) / 60000),
    );
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes ? `${hours}h ${minutes}p` : `${hours}h`;
  }

  if (fallbackHours) {
    const hours = Math.floor(fallbackHours);
    const minutes = Math.round((fallbackHours - hours) * 60);
    return minutes ? `${hours}h ${minutes}p` : `${hours}h`;
  }

  return '--';
}

function toTripCardModel(trip: OdooTripSummary, index: number): SearchTrip {
  const vehicleName =
    trip.vehicle?.license_plate || trip.vehicle?.name || relationName(trip.vehicle_id);
  const vehicleType =
    trip.vehicle?.vehicle_type ||
    trip.vehicle?.seat_layout ||
    (trip.vehicle?.capacity ? `${trip.vehicle.capacity} chỗ` : 'Xe khách');

  return {
    id: trip.id,
    departureTime: formatTime(trip.departure_time),
    arrivalTime: formatTime(trip.arrival_time),
    duration: formatDuration(
      trip.departure_time,
      trip.arrival_time,
      trip.route?.duration_hours,
    ),
    origin: trip.route?.origin || relationName(trip.route_id),
    destination: trip.route?.destination || relationName(trip.route_id),
    operator: vehicleName,
    vehicleType,
    price: Number(trip.price || trip.route?.price || 0),
    seatsLeft: trip.available_seats,
    color: ['#5c9f92', '#4d8ea1', '#7b8f76', '#d97a27'][index % 4],
  };
}

export function TicketSearchResultsScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const params = route.params;
  const [trips, setTrips] = useState<OdooTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeTitle = `${params.originName} → ${params.destinationName}`;
  const headerDate = formatHeaderDate(params.travelDate);
  const tripCards = useMemo(
    () => trips.map((trip, index) => toTripCardModel(trip, index)),
    [trips],
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
        const query = new URLSearchParams({
          route_id: String(params.routeId),
          date_from: params.travelDate,
          date_to: params.travelDate,
          states: 'draft,confirmed',
          limit: '50',
        });
        const data = await requestJson<TripsResponse>(
          `/api/nhaxe/odoo/trips/?${query.toString()}`,
          {
            method: 'GET',
            auth: true,
            logLabel: 'customer-trip-results',
          },
        );
        setTrips(data.results || []);
      } catch (tripError) {
        const message =
          tripError instanceof Error
            ? tripError.message
            : 'Không tải được danh sách chuyến.';
        setError(message);
        showToast({
          type: 'error',
          title: 'Không tải được chuyến',
          message,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params.routeId, params.travelDate, showToast],
  );

  useEffect(() => {
    loadTrips('initial');
  }, [loadTrips]);

  const chooseTripSeats = (trip: SearchTrip) => {
    navigation.navigate('TicketBooking', {
      initialTripId: trip.id,
      initialTravelDate: params.travelDate,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={APP_COLORS.surface} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {routeTitle}
            </Text>
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDate}>{headerDate}</Text>
              <Ionicons name="chevron-down" size={18} color={APP_COLORS.surface} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.priceCompare}>
        <PriceMode
          icon="bus"
          price={
            params.minPrice
              ? formatTripPrice(params.minPrice)
              : `${params.tripCount || tripCards.length} chuyến`
          }
          duration={params.serviceType || 'coach'}
          active
        />
        <View style={styles.transferMode}>
          <View style={styles.discountPill}>
            <Text style={styles.discountText}>
              {params.tripCount || tripCards.length}
            </Text>
          </View>
          <Ionicons name="airplane" size={28} color="#111111" />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
        <PriceMode
          icon="train"
          price={params.maxPrice ? formatTripPrice(params.maxPrice) : 'Odoo'}
          duration="giá cao nhất"
          discount="API"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTrips('refresh')}
            tintColor={APP_COLORS.primaryDark}
            colors={[APP_COLORS.primaryDark, APP_COLORS.info]}
          />
        }
      >
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={APP_COLORS.primaryDark} />
            <Text style={styles.stateTitle}>Đang tải chuyến đi</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={34} color={APP_COLORS.danger} />
            <Text style={styles.stateTitle}>Không tải được danh sách chuyến</Text>
            <Text style={styles.stateMessage}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => loadTrips('initial')}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && !tripCards.length ? (
          <View style={styles.stateCard}>
            <Ionicons name="bus-outline" size={34} color={APP_COLORS.textSecondary} />
            <Text style={styles.stateTitle}>Chưa có chuyến phù hợp</Text>
            <Text style={styles.stateMessage}>
              Bạn thử đổi ngày đi hoặc tuyến đường khác nhé.
            </Text>
          </View>
        ) : null}

        {!loading && !error
          ? tripCards.map((trip, index) => (
              <TripCard
                key={trip.id}
                trip={trip}
                featured={index === 0}
                onChooseSeat={() => chooseTripSeats(trip)}
              />
            ))
          : null}
      </ScrollView>

    </SafeAreaView>
  );
}

function PriceMode({
  icon,
  price,
  duration,
  active,
  discount,
}: {
  icon: IconName;
  price: string;
  duration: string;
  active?: boolean;
  discount?: string;
}) {
  return (
    <View style={[styles.priceMode, active && styles.priceModeActive]}>
      {discount ? (
        <View style={styles.discountPill}>
          <Text style={styles.discountText}>{discount}</Text>
        </View>
      ) : null}
      <Ionicons
        name={icon}
        size={34}
        color={active ? APP_COLORS.primaryDark : '#222222'}
      />
      <View>
        <Text style={[styles.priceModePrice, active && styles.priceModePriceActive]}>
          {price}
        </Text>
        <Text style={[styles.priceModeDuration, active && styles.priceModeDurationActive]}>
          {duration}
        </Text>
      </View>
    </View>
  );
}

function TripCard({
  trip,
  featured,
  onChooseSeat,
}: {
  trip: SearchTrip;
  featured?: boolean;
  onChooseSeat: () => void;
}) {
  return (
    <View style={styles.tripCard}>
      <View style={[styles.tripTop, featured && styles.tripTopFeatured]}>
        <View style={styles.timeColumn}>
          <Text style={styles.departureTime}>{trip.departureTime}</Text>
          <Text style={styles.duration}>{trip.duration}</Text>
          <Text style={styles.arrivalTime}>{trip.arrivalTime}</Text>
        </View>
        <View style={styles.routeRail}>
          <View style={styles.blueDot} />
          <View style={styles.railLine} />
          <Ionicons name="location" size={18} color="#ef5350" />
        </View>
        <View style={styles.stopColumn}>
          <Text style={styles.originText} numberOfLines={2}>
            {trip.origin}
          </Text>
          <Text style={styles.destinationText} numberOfLines={2}>
            {trip.destination}
          </Text>
        </View>
        <View style={styles.priceColumn}>
          <Text style={styles.fromText}>Từ</Text>
          <Text style={styles.price}>{formatTripPrice(trip.price)}</Text>
          <Text style={styles.seatsLeft}>{trip.seatsLeft} chỗ trống</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.operatorRow}>
        <View style={[styles.tripImage, { backgroundColor: trip.color }]}>
          <Ionicons name="bus" size={28} color={APP_COLORS.surface} />
          <Text style={styles.tripImageText}>annhien</Text>
        </View>
        <View style={styles.operatorInfo}>
          <Text style={styles.operatorName} numberOfLines={1}>
            {trip.operator}
          </Text>
          <Text style={styles.vehicleType} numberOfLines={1}>
            {trip.vehicleType}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Pressable style={styles.chooseSeatButton} onPress={onChooseSeat}>
          <Text style={styles.chooseSeatText}>Chọn chỗ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.primaryDark,
  },
  header: {
    backgroundColor: APP_COLORS.primaryDark,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTop: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 6,
  },
  headerTitle: {
    color: APP_COLORS.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  headerDateRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDate: {
    color: APP_COLORS.surface,
    fontSize: 14,
  },
  changeText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  priceCompare: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: APP_COLORS.surface,
  },
  priceMode: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  priceModeActive: {
    borderBottomWidth: 3,
    borderBottomColor: APP_COLORS.primaryDark,
  },
  priceModePrice: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
  priceModePriceActive: {
    color: APP_COLORS.primaryDark,
  },
  priceModeDuration: {
    color: '#333333',
    fontSize: 12,
  },
  priceModeDurationActive: {
    color: APP_COLORS.primary,
  },
  transferMode: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountPill: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 1,
    backgroundColor: '#ef5350',
  },
  discountText: {
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonLine: {
    position: 'absolute',
    right: 6,
    width: 48,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#eeeeee',
  },
  skeletonLineShort: {
    top: 52,
    width: 42,
  },
  contentContainer: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 100,
    backgroundColor: '#f6f7f5',
  },
  stateCard: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: APP_COLORS.surface,
  },
  stateTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateMessage: {
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    minWidth: 104,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryDark,
  },
  retryText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  tripCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: APP_COLORS.surface,
    overflow: 'hidden',
  },
  badgeRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    height: 38,
    minWidth: 196,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderBottomRightRadius: 18,
    backgroundColor: APP_COLORS.warning,
  },
  badgeText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  endsInText: {
    flex: 1,
    color: APP_COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tripTop: {
    minHeight: 118,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tripTopFeatured: {
    paddingTop: 12,
  },
  timeColumn: {
    width: 62,
    alignItems: 'flex-start',
  },
  departureTime: {
    color: '#000000',
    fontSize: 21,
    fontWeight: '800',
  },
  duration: {
    marginTop: 16,
    alignSelf: 'center',
    color: '#8c8c8c',
    fontSize: 12,
  },
  arrivalTime: {
    marginTop: 16,
    color: '#8c8c8c',
    fontSize: 21,
    fontWeight: '800',
  },
  routeRail: {
    width: 28,
    alignItems: 'center',
    paddingTop: 5,
  },
  blueDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryDark,
    borderWidth: 4,
    borderColor: APP_COLORS.primaryLight,
  },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#dddddd',
  },
  stopColumn: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 10,
    paddingRight: 8,
  },
  originText: {
    color: '#111111',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  destinationText: {
    marginTop: 28,
    color: '#8d8d8d',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  priceColumn: {
    width: 96,
    alignItems: 'flex-end',
  },
  fromText: {
    color: '#888888',
    fontSize: 12,
  },
  price: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
  },
  originalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  originalPrice: {
    color: '#8d8d8d',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  smallDiscount: {
    overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    color: APP_COLORS.surface,
    backgroundColor: '#ef5350',
    fontSize: 11,
    fontWeight: '700',
  },
  seatsLeft: {
    marginTop: 7,
    color: '#111111',
    fontSize: 13,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  coupon: {
    flex: 1,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.primaryDark,
    borderRadius: 5,
    overflow: 'hidden',
  },
  couponCompact: {
    flex: 0.8,
  },
  couponIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  couponText: {
    flex: 1,
    paddingHorizontal: 6,
    color: APP_COLORS.primaryDark,
    fontSize: 12,
  },
  cardDivider: {
    height: 1,
    marginHorizontal: 16,
    backgroundColor: '#e2e2e2',
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tripImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripImageText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 11,
    fontWeight: '700',
  },
  operatorInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  operatorName: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
  },
  vehicleType: {
    marginTop: 5,
    color: '#111111',
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  ratingText: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '800',
  },
  reviewText: {
    color: '#8d8d8d',
    fontSize: 12,
  },
  heartButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  perkList: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  perkText: {
    color: '#222222',
    fontSize: 13,
  },
  chooseSeatButton: {
    width: 104,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffd031',
  },
  chooseSeatText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
  },
  filterBar: {
    position: 'absolute',
    left: 46,
    right: 46,
    bottom: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 27,
    borderWidth: 1,
    borderColor: APP_COLORS.surface,
    backgroundColor: APP_COLORS.primaryDark,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  filterButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  filterText: {
    color: APP_COLORS.surface,
    fontSize: 13,
  },
  filterDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
