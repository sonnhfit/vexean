import { ComponentProps, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import {
  addFavoriteTrip,
  formatTripPrice,
  isFavoriteTrip,
  MockTrip,
  mockTrips,
} from '../../data/mockTrips';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'TicketSearchResults'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

export function TicketSearchResultsScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [favoriteIds, setFavoriteIds] = useState(
    () => new Set(mockTrips.filter(trip => isFavoriteTrip(trip.id)).map(trip => trip.id)),
  );

  const favoriteTrip = (trip: MockTrip) => {
    addFavoriteTrip(trip.id);
    setFavoriteIds(current => new Set(current).add(trip.id));
    showToast({
      type: 'success',
      title: 'Đã thêm vào yêu thích',
      message: trip.operator,
    });
    navigation.navigate('MainTabs', { screen: 'CustomerFavorites' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={APP_COLORS.surface} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Hà Nội → Sa Pa</Text>
            <View style={styles.headerDateRow}>
              <Text style={styles.headerDate}>T4, 17/06/2026</Text>
              <Ionicons name="chevron-down" size={18} color={APP_COLORS.surface} />
            </View>
          </View>
          <Pressable>
            <Text style={styles.changeText}>Thay đổi</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.priceCompare}>
        <PriceMode icon="bus" price="330K" duration="5h 24p" active />
        <View style={styles.transferMode}>
          <View style={styles.discountPill}>
            <Text style={styles.discountText}>-30k</Text>
          </View>
          <Ionicons name="airplane" size={28} color="#111111" />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
        <PriceMode icon="train" price="476K" duration="7h 45p" discount="-25%" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {mockTrips.map((trip, index) => (
          <TripCard
            key={trip.id}
            trip={trip}
            featured={index === 0}
            favorite={favoriteIds.has(trip.id)}
            onFavorite={() => favoriteTrip(trip)}
          />
        ))}
      </ScrollView>

      <View style={styles.filterBar}>
        <FilterButton icon="options-outline" label="Lọc" />
        <View style={styles.filterDivider} />
        <FilterButton icon="filter-outline" label="Sắp xếp" />
        <View style={styles.filterDivider} />
        <FilterButton icon="time-outline" label="Giờ đi" />
        <View style={styles.filterDivider} />
        <FilterButton icon="bus-outline" label="Nhà xe" />
      </View>
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
  favorite,
  onFavorite,
}: {
  trip: MockTrip;
  featured?: boolean;
  favorite: boolean;
  onFavorite: () => void;
}) {
  return (
    <View style={styles.tripCard}>
      {trip.badge ? (
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="timer-outline" size={14} color={APP_COLORS.surface} />
            <Text style={styles.badgeText}>{trip.badge}</Text>
          </View>
          <Text style={styles.endsInText}>{trip.endsIn}</Text>
        </View>
      ) : null}

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
          {trip.originalPrice ? (
            <View style={styles.originalRow}>
              <Text style={styles.originalPrice}>
                {formatTripPrice(trip.originalPrice)}
              </Text>
              {trip.discountLabel ? (
                <Text style={styles.smallDiscount}>{trip.discountLabel}</Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.seatsLeft}>{trip.seatsLeft} chỗ trống</Text>
        </View>
      </View>

      <View style={styles.couponRow}>
        <Coupon text="Giảm 50%, tối đa 250k" />
        <Coupon text="Giảm 50%, tối đa 250k" />
        <Coupon text="Giảm 25%" compact />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.operatorRow}>
        <View style={[styles.tripImage, { backgroundColor: trip.color }]}>
          <Ionicons name="bus" size={28} color={APP_COLORS.surface} />
          <Text style={styles.tripImageText}>vexere</Text>
        </View>
        <View style={styles.operatorInfo}>
          <Text style={styles.operatorName} numberOfLines={1}>
            {trip.operator}
          </Text>
          <Text style={styles.vehicleType} numberOfLines={1}>
            {trip.vehicleType}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{trip.rating.toFixed(1)}</Text>
            <Ionicons name="star" size={20} color="#ffcf33" />
            <Text style={styles.reviewText}>({trip.reviewCount} đánh giá)</Text>
          </View>
        </View>
        <Pressable style={styles.heartButton} onPress={onFavorite}>
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={28}
            color={favorite ? '#ef5350' : APP_COLORS.primaryDark}
          />
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.perkList}>
          {trip.perks.map((perk, index) => (
            <View key={perk} style={styles.perkRow}>
              <PerkIcon index={index} />
              <Text style={styles.perkText} numberOfLines={1}>
                {perk}
              </Text>
              {perk.includes('lập tức') ? (
                <Ionicons name="information-circle-outline" size={15} color={APP_COLORS.primaryDark} />
              ) : null}
            </View>
          ))}
        </View>
        <Pressable style={styles.chooseSeatButton}>
          <Text style={styles.chooseSeatText}>Chọn chỗ</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Coupon({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <View style={[styles.coupon, compact && styles.couponCompact]}>
      <View style={styles.couponIcon}>
        <Ionicons name="flash" size={16} color="#ffd32a" />
      </View>
      <Text style={styles.couponText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function PerkIcon({ index }: { index: number }) {
  const icons: IconName[] = ['card', 'call', 'flash', 'location'];
  const colors = ['#2fac6a', '#2fac6a', '#2fac6a', '#ef5350'];
  return <Ionicons name={icons[index % icons.length]} size={18} color={colors[index % colors.length]} />;
}

function FilterButton({ icon, label }: { icon: IconName; label: string }) {
  return (
    <Pressable style={styles.filterButton}>
      <Ionicons name={icon} size={22} color={APP_COLORS.surface} />
      <Text style={styles.filterText}>{label}</Text>
    </Pressable>
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
