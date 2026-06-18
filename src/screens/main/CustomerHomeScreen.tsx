import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  CompositeNavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import {
  clearCustomerRecentSearches,
  CustomerRecentSearch,
  fetchCustomerRecentSearches,
} from '../../services/customerRecentSearches';
import { requestJson } from '../../services/apiClient';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import {
  CustomerLocationPickerMode,
  MainTabParamList,
  RootStackParamList,
} from '../../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];
type CustomerHomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'CustomerHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type CustomerHomeRoute = RouteProp<MainTabParamList, 'CustomerHome'>;

const popularRoutes = [
  { id: 'fallback-sapa', title: 'Sapa', color: '#5c9f92' },
  { id: 'fallback-ha-long', title: 'Hạ Long', color: '#4d8ea1' },
  { id: 'fallback-da-lat', title: 'Đà Lạt', color: '#7b8f76' },
];

const defaultServices: CustomerHomeServiceType[] = [
  { id: 'coach', label: 'Xe khách', icon: 'bus', active: true },
  {
    id: 'limousine',
    label: 'Limousine',
    icon: 'sparkles-outline',
    active: true,
  },
  { id: 'seat', label: 'Ghế ngồi', icon: 'ticket-outline', active: true },
  { id: 'sleeper', label: 'Giường nằm', icon: 'bed-outline', active: true },
];

const defaultBenefits: CustomerHomeBenefit[] = [
  { id: 'guaranteed-seat', icon: 'shield-checkmark', text: 'Chắc chắn có chỗ' },
  { id: 'support', icon: 'headset', text: 'Hỗ trợ 24/7' },
  { id: 'deals', icon: 'pricetag', text: 'Nhiều ưu đãi' },
  { id: 'payment', icon: 'cash', text: 'Thanh toán đa dạng' },
];

type CustomerHomeLocation = {
  id: number;
  name: string;
  province?: string;
  type?: string;
  slug?: string;
  display_name?: string;
  active?: boolean;
};

type CustomerHomeServiceType = {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
};

type CustomerHomeBenefit = {
  id: string;
  icon: string;
  text: string;
};

type CustomerHomeSearch = {
  origin: CustomerHomeLocation | null;
  destination: CustomerHomeLocation | null;
  travel_date: string;
  round_trip: boolean;
  return_date: string | null;
};

type CustomerHomeRecentSearch = {
  id: number;
  origin: CustomerHomeLocation;
  destination: CustomerHomeLocation;
  travel_date: string;
  return_date: string | null;
  round_trip: boolean;
  service_type?: string;
  created_at?: string;
};

type CustomerHomePopularRoute = {
  id: number;
  origin?: CustomerHomeLocation;
  destination?: CustomerHomeLocation;
  title: string;
  subtitle?: string;
  image_url?: string;
  color?: string;
  min_price?: number | null;
  trip_count?: number;
  score?: number;
};

type CustomerHomeResponse = {
  user: {
    display_name?: string;
    phone?: string;
  } | null;
  default_search: CustomerHomeSearch;
  service_types: CustomerHomeServiceType[];
  benefits: CustomerHomeBenefit[];
  recent_searches: CustomerHomeRecentSearch[];
  popular_routes: CustomerHomePopularRoute[];
  meta?: {
    server_time?: string;
    updated_at?: string;
  };
};

type CustomerRouteSearchResponse = {
  query: {
    origin_id: number;
    destination_id: number;
    travel_date: string;
    return_date: string | null;
    service_type: string;
    passengers: number;
  };
  summary: {
    available: boolean;
    trip_count: number;
    min_price: number | null;
    max_price: number | null;
  };
  routes: {
    id: number;
    name: string;
    origin: {
      id: number;
      name: string;
    };
    destination: {
      id: number;
      name: string;
    };
    trip_count: number;
    min_price: number | null;
    first_departure_time?: string;
    last_departure_time?: string;
  }[];
};

function formatTravelDate(value: string | null | undefined) {
  if (!value) {
    return 'Ngày đi';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function swapSearchRoute(search: CustomerHomeSearch): CustomerHomeSearch {
  return {
    ...search,
    origin: search.destination,
    destination: search.origin,
  };
}

export function CustomerHomeScreen() {
  const navigation = useNavigation<CustomerHomeNavigation>();
  const route = useRoute<CustomerHomeRoute>();
  const { showToast } = useToast();
  const user = useAppSelector(state => state.auth.user);
  const [homeData, setHomeData] = useState<CustomerHomeResponse | null>(null);
  const [recentSearches, setRecentSearches] = useState<CustomerRecentSearch[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<CustomerHomeSearch | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [routeSwapped, setRouteSwapped] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState('coach');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const data = await requestJson<CustomerHomeResponse>(
        '/api/nhaxe/customer/home/?limit_recent=5&limit_popular=10',
        {
          method: 'GET',
          auth: true,
          logLabel: 'customer-home',
        },
      );

      setHomeData(data);
      setSelectedSearch(data.default_search);
      setRoundTrip(data.default_search.round_trip);
      setRouteSwapped(false);
      setSelectedServiceType(current => {
        if (data.service_types.some(service => service.id === current)) {
          return current;
        }

        return (
          data.service_types.find(service => service.active)?.id ||
          data.service_types[0]?.id ||
          'coach'
        );
      });

      try {
        const recentData = await fetchCustomerRecentSearches(10);
        setRecentSearches(recentData);
      } catch {
        setRecentSearches(data.recent_searches || []);
      }
    } catch (homeError) {
      const message =
        homeError instanceof Error
          ? homeError.message
          : 'Không tải được dữ liệu trang chủ.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHome('initial');
  }, [loadHome]);

  const onRefresh = useCallback(() => {
    loadHome('refresh');
  }, [loadHome]);

  useEffect(() => {
    const selectedLocation = route.params?.selectedLocation;
    if (!selectedLocation) {
      return;
    }

    setSelectedSearch(current => {
      const baseSearch =
        current ||
        homeData?.default_search || {
          origin: null,
          destination: null,
          travel_date: new Date().toISOString().slice(0, 10),
          round_trip: false,
          return_date: null,
        };

      return {
        ...baseSearch,
        origin:
          selectedLocation.mode === 'origin'
            ? selectedLocation.location
            : baseSearch.origin,
        destination:
          selectedLocation.mode === 'destination'
            ? selectedLocation.location
            : baseSearch.destination,
        round_trip: roundTrip,
      };
    });
    setRouteSwapped(false);
  }, [homeData?.default_search, route.params?.selectionKey, route.params?.selectedLocation, roundTrip]);

  const clearRecentSearches = async () => {
    try {
      await clearCustomerRecentSearches();
      setRecentSearches([]);
      setHomeData(current =>
        current ? { ...current, recent_searches: [] } : current,
      );
    } catch (clearError) {
      const message =
        clearError instanceof Error
          ? clearError.message
          : 'Không xóa được lịch sử tìm kiếm.';
      showToast({
        type: 'error',
        title: 'Không xóa được lịch sử',
        message,
      });
    }
  };

  const findRoute = async (search: CustomerHomeSearch) => {
    if (!search.origin?.id || !search.destination?.id) {
      throw new Error('Vui lòng chọn nơi xuất phát và nơi đến.');
    }

    const params = new URLSearchParams({
      origin_id: String(search.origin.id),
      destination_id: String(search.destination.id),
      travel_date: search.travel_date,
      service_type: selectedServiceType,
      passengers: '1',
    });

    if (roundTrip && search.return_date) {
      params.set('return_date', search.return_date);
    }

    return requestJson<CustomerRouteSearchResponse>(
      `/api/nhaxe/odoo/route-search/?${params.toString()}`,
      {
        method: 'GET',
        auth: true,
        logLabel: 'customer-route-search',
      },
    );
  };

  const openLocationPicker = (mode: CustomerLocationPickerMode) => {
    navigation.navigate('CustomerLocationSearch', {
      mode,
      currentLocation:
        mode === 'origin' ? activeSearch?.origin : activeSearch?.destination,
    });
  };

  const handleSearch = async () => {
    if (!activeSearch) {
      showToast({
        type: 'error',
        title: 'Chưa có dữ liệu tìm kiếm',
        message: 'Vui lòng tải lại trang chủ rồi thử lại.',
      });
      return;
    }

    setSearching(true);
    try {
      const routeSearch = await findRoute(activeSearch);
      const selectedRoute = routeSearch.routes[0];
      if (!routeSearch.summary.available || !selectedRoute) {
        showToast({
          type: 'info',
          title: 'Chưa có chuyến phù hợp',
          message: 'Bạn thử đổi ngày đi hoặc tuyến đường khác nhé.',
        });
        return;
      }

      navigation.navigate('TicketSearchResults', {
        routeId: selectedRoute.id,
        originName: activeSearch.origin?.name || selectedRoute.origin.name,
        destinationName:
          activeSearch.destination?.name || selectedRoute.destination.name,
        travelDate: activeSearch.travel_date,
        returnDate: roundTrip ? activeSearch.return_date : null,
        serviceType: selectedServiceType,
        passengers: routeSearch.query.passengers,
        tripCount: routeSearch.summary.trip_count,
        minPrice: routeSearch.summary.min_price,
        maxPrice: routeSearch.summary.max_price,
      });
      fetchCustomerRecentSearches(10)
        .then(setRecentSearches)
        .catch(() => undefined);
    } catch (searchError) {
      const message =
        searchError instanceof Error
          ? searchError.message
          : 'Không mở được danh sách chuyến.';
      showToast({
        type: 'error',
        title: 'Không tìm được chuyến',
        message,
      });
    } finally {
      setSearching(false);
    }
  };

  const activeSearch = useMemo(() => {
    if (!selectedSearch) {
      return null;
    }

    return routeSwapped ? swapSearchRoute(selectedSearch) : selectedSearch;
  }, [selectedSearch, routeSwapped]);
  const services = homeData?.service_types.length
    ? homeData.service_types
    : defaultServices;
  const benefits = homeData?.benefits.length ? homeData.benefits : defaultBenefits;
  const renderedRecentSearches = recentSearches.length
    ? recentSearches.map(item => ({
        raw: item,
        id: String(item.id),
        from: item.origin.name,
        to: item.destination.name,
        date: formatTravelDate(item.travel_date),
      }))
    : [];
  const renderedPopularRoutes = homeData?.popular_routes.length
    ? homeData.popular_routes.map((popularRoute, index) => ({
        id: String(popularRoute.id),
        title:
          popularRoute.title ||
          popularRoute.destination?.name ||
          'Tuyến phổ biến',
        color:
          popularRoute.color ||
          popularRoutes[index % popularRoutes.length]?.color ||
          APP_COLORS.primaryDark,
      }))
    : popularRoutes;

  const canClearRecentSearches = Boolean(recentSearches.length);
  const fallbackOrigin = routeSwapped ? 'Bà Rịa-Vũng Tàu' : 'Hồ Chí Minh';
  const fallbackDestination = routeSwapped ? 'Hồ Chí Minh' : 'Bà Rịa-Vũng Tàu';
  const selectedOrigin = activeSearch?.origin?.name || fallbackOrigin;
  const selectedDestination =
    activeSearch?.destination?.name || fallbackDestination;
  const selectedTravelDate = formatTravelDate(activeSearch?.travel_date);
  const refreshLabel = useMemo(() => {
    if (loading) {
      return 'Đang tải dữ liệu...';
    }
    return error;
  }, [error, loading]);

  const selectRecentSearch = (recentSearch: CustomerRecentSearch) => {
    setSelectedSearch({
      origin: recentSearch.origin,
      destination: recentSearch.destination,
      travel_date: recentSearch.travel_date,
      return_date: recentSearch.return_date,
      round_trip: recentSearch.round_trip,
    });
    setRoundTrip(recentSearch.round_trip);
    setRouteSwapped(false);
    if (recentSearch.service_type) {
      setSelectedServiceType(recentSearch.service_type);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.surface}
            colors={[APP_COLORS.primaryDark, APP_COLORS.info]}
            progressBackgroundColor={APP_COLORS.surface}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="leaf-outline" size={22} color="#f1d58a" />
              </View>
              <Text style={styles.logoText}>An Nhiên</Text>
            </View>
            {user ? (
              <Pressable
                style={styles.profileButton}
                onPress={() => navigation.navigate('Account')}
                accessibilityRole="button"
                accessibilityLabel="Mở tài khoản"
              >
                <Ionicons
                  name="person-circle-outline"
                  size={30}
                  color={APP_COLORS.surface}
                />
              </Pressable>
            ) : (
              <Pressable>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.promise}>
            Chọn chuyến đi an tâm, nhẹ nhàng và thuận tiện cho từng hành trình
          </Text>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.transportTabs}>
            {services.map(service => (
              <TransportTab
                key={service.id}
                icon={service.icon as IconName}
                label={service.label}
                active={selectedServiceType === service.id}
                onPress={() => setSelectedServiceType(service.id)}
              />
            ))}
          </View>

          <View style={styles.routeBlock}>
            <View style={styles.routeDots}>
              <View style={styles.dotBlue} />
              <View style={styles.dotLine} />
              <View style={styles.dotRed} />
            </View>
            <View style={styles.routeFields}>
              <RouteField
                label="Nơi xuất phát"
                value={selectedOrigin}
                onPress={() => openLocationPicker('origin')}
              />
              <View style={styles.divider} />
              <RouteField
                label="Bạn muốn đi đâu?"
                value={selectedDestination}
                onPress={() => openLocationPicker('destination')}
              />
            </View>
            <Pressable
              style={styles.swapButton}
              onPress={() => setRouteSwapped(value => !value)}
              accessibilityRole="button"
              accessibilityLabel="Đảo nơi xuất phát và nơi đến"
            >
              <Ionicons name="swap-vertical" size={22} color="#555555" />
            </Pressable>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Ionicons name="calendar-outline" size={22} color={APP_COLORS.primaryDark} />
              <Text style={styles.dateLabel}>{selectedTravelDate}</Text>
            </View>
            <View style={styles.roundTripWrap}>
              <Text style={styles.roundTripText}>Khứ hồi</Text>
              <Pressable
                style={[styles.switch, roundTrip && styles.switchActive]}
                onPress={() => setRoundTrip(value => !value)}
              >
                <View style={[styles.switchKnob, roundTrip && styles.switchKnobActive]} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
        >
          <Text style={styles.searchButtonText}>
            {searching ? 'Đang tìm...' : 'Tìm kiếm'}
          </Text>
        </Pressable>

        {refreshLabel ? <Text style={styles.feedbackText}>{refreshLabel}</Text> : null}

        <View style={styles.benefitRow}>
          {benefits.map(benefit => (
            <Benefit
              key={benefit.id}
              icon={benefit.icon as IconName}
              text={benefit.text}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
          <Pressable
            onPress={clearRecentSearches}
            disabled={!canClearRecentSearches}
          >
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentList}
        >
          {renderedRecentSearches.map(item => (
            <Pressable
              key={item.id}
              style={styles.recentCard}
              onPress={() => selectRecentSearch(item.raw)}
              accessibilityRole="button"
              accessibilityLabel={`Chọn lại ${item.from} đến ${item.to}`}
            >
              <View style={styles.recentRoute}>
                <View style={styles.smallDots}>
                  <View style={styles.smallDotBlue} />
                  <View style={styles.smallDotRed} />
                </View>
                <View style={styles.recentTextWrap}>
                  <Text style={styles.recentCity}>{item.from}</Text>
                  <Text style={styles.recentCity}>{item.to}</Text>
                  <Text style={styles.recentDate}>{item.date}</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={22} color="#111111" />
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Tuyến đường phổ biến</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularList}
        >
          {renderedPopularRoutes.map(popularRoute => (
            <View
              key={popularRoute.id}
              style={[
                styles.popularCard,
                { backgroundColor: popularRoute.color },
              ]}
            >
              <Text style={styles.popularText}>{popularRoute.title}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function TransportTab({
  icon,
  label,
  active = false,
  badge,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.transportTab} onPress={onPress}>
      {badge ? (
        <View style={styles.transportBadge}>
          <Text style={styles.transportBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons
        name={icon}
        size={24}
        color={active ? APP_COLORS.primaryDark : '#5f6f6d'}
      />
      <Text style={[styles.transportText, active && styles.transportTextActive]}>
        {label}
      </Text>
      {active ? <View style={styles.transportIndicator} /> : null}
    </Pressable>
  );
}

function RouteField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.routeField}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </Pressable>
  );
}

function Benefit({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.benefitItem}>
      <Ionicons name={icon} size={18} color="#2fac6a" />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.primaryDark,
  },
  contentContainer: {
    paddingBottom: 28,
    backgroundColor: '#f6f7f5',
  },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 104,
    backgroundColor: APP_COLORS.primaryDark,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: APP_COLORS.surface,
    fontSize: 24,
    fontWeight: '600',
  },
  loginLink: {
    color: APP_COLORS.surface,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  promise: {
    marginTop: 22,
    color: '#eef8f6',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  searchCard: {
    marginHorizontal: 18,
    marginTop: -86,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    overflow: 'hidden',
  },
  transportTabs: {
    height: 76,
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#d9d9d9',
  },
  transportTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  transportText: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '600',
  },
  transportTextActive: {
    color: APP_COLORS.primaryDark,
    fontWeight: '600',
  },
  transportIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: 3,
    backgroundColor: APP_COLORS.primaryDark,
  },
  transportBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    backgroundColor: '#d9a94f',
  },
  transportBadgeText: {
    color: APP_COLORS.surface,
    fontSize: 11,
    fontWeight: '700',
  },
  routeBlock: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  routeDots: {
    width: 28,
    alignItems: 'center',
  },
  dotBlue: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: APP_COLORS.primaryDark,
    borderWidth: 6,
    borderColor: '#d7e7ff',
  },
  dotLine: {
    width: 3,
    height: 42,
    borderStyle: 'dashed',
    borderLeftWidth: 3,
    borderLeftColor: '#dedede',
  },
  dotRed: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#d9a94f',
    borderWidth: 6,
    borderColor: '#f5ead2',
  },
  routeFields: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16,
  },
  routeField: {
    minHeight: 56,
    justifyContent: 'center',
  },
  routeLabel: {
    color: '#9b9b9b',
    fontSize: 14,
  },
  routeValue: {
    marginTop: 4,
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e2e2',
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efefef',
  },
  dateRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingHorizontal: 22,
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  dateLabel: {
    color: '#a0a0a0',
    fontSize: 15,
  },
  roundTripWrap: {
    alignItems: 'center',
    gap: 8,
  },
  roundTripText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 3,
    backgroundColor: '#d8d8d8',
  },
  switchActive: {
    backgroundColor: APP_COLORS.primaryDark,
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: APP_COLORS.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  switchKnobActive: {
    marginLeft: 22,
  },
  searchButton: {
    minHeight: 52,
    borderRadius: 8,
    marginHorizontal: 18,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1d58a',
  },
  searchButtonText: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
  feedbackText: {
    marginHorizontal: 18,
    marginTop: 10,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  benefitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    flex: 1,
    color: '#222222',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 10,
  },
  sectionTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 18,
  },
  clearText: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  recentList: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  recentCard: {
    width: 210,
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_COLORS.surface,
  },
  recentRoute: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    gap: 12,
  },
  smallDots: {
    alignItems: 'center',
    gap: 9,
    paddingTop: 4,
  },
  smallDotBlue: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryDark,
  },
  smallDotRed: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#d9a94f',
  },
  recentTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  recentCity: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  recentDate: {
    color: '#333333',
    fontSize: 13,
  },
  popularList: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  popularCard: {
    width: 164,
    height: 96,
    borderRadius: 10,
    justifyContent: 'flex-end',
    padding: 16,
  },
  popularText: {
    color: APP_COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
