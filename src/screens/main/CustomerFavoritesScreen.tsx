import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatTripPrice,
  getFavoriteTrips,
  MockTrip,
  removeFavoriteTrip,
} from '../../data/mockTrips';
import { APP_COLORS } from '../../theme/colors';

export function CustomerFavoritesScreen() {
  const [favorites, setFavorites] = useState<MockTrip[]>([]);

  useFocusEffect(
    useCallback(() => {
      setFavorites(getFavoriteTrips());
    }, []),
  );

  const removeFavorite = (tripId: string) => {
    removeFavoriteTrip(tripId);
    setFavorites(getFavoriteTrips());
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yêu thích</Text>
      </View>

      <View style={styles.body}>
        {favorites.length ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {favorites.map(trip => (
              <FavoriteCard
                key={trip.id}
                trip={trip}
                onRemove={() => removeFavorite(trip.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={42} color="#8d8d8d" />
            <Text style={styles.emptyTitle}>Chưa có chuyến yêu thích</Text>
            <Text style={styles.emptyText}>
              Bấm biểu tượng trái tim ở danh sách chuyến để lưu lại tại đây.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function FavoriteCard({
  trip,
  onRemove,
}: {
  trip: MockTrip;
  onRemove: () => void;
}) {
  return (
    <View style={styles.favoriteCard}>
      <View style={styles.tripTop}>
        <View style={styles.timeColumn}>
          <Text style={styles.departureTime}>{trip.departureTime}</Text>
          <Text style={styles.duration}>{trip.duration}</Text>
          <Text style={styles.arrivalTime}>{trip.arrivalTime}</Text>
        </View>
        <View style={styles.routeRail}>
          <View style={styles.blueDot} />
          <View style={styles.railLine} />
          <Ionicons name="location" size={20} color="#ef5350" />
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

      <View style={styles.cardDivider} />

      <View style={styles.operatorRow}>
        <View style={[styles.tripImage, { backgroundColor: trip.color }]}>
          <Ionicons name="bus" size={30} color={APP_COLORS.surface} />
          <Text style={styles.imageBadge}>Xe Xịn</Text>
        </View>
        <View style={styles.operatorInfo}>
          <Text style={styles.operatorName} numberOfLines={1}>
            {trip.operator}
          </Text>
          <Text style={styles.vehicleType} numberOfLines={1}>
            {trip.vehicleType}
          </Text>
          <Pressable style={styles.moreTimeButton}>
            <Text style={styles.moreTimeText}>Xem các khung giờ khác</Text>
            <Ionicons name="arrow-forward" size={21} color={APP_COLORS.primaryDark} />
          </Pressable>
        </View>
        <Pressable style={styles.heartButton} onPress={onRemove}>
          <Ionicons name="heart" size={32} color="#ef5350" />
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
    height: 104,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: APP_COLORS.primaryDark,
  },
  headerTitle: {
    color: APP_COLORS.surface,
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    backgroundColor: '#f6f7f5',
  },
  contentContainer: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  favoriteCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    paddingHorizontal: 14,
    paddingVertical: 18,
    backgroundColor: APP_COLORS.surface,
  },
  tripTop: {
    minHeight: 134,
    flexDirection: 'row',
  },
  timeColumn: {
    width: 68,
  },
  departureTime: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '900',
  },
  duration: {
    marginTop: 24,
    alignSelf: 'center',
    color: '#8c8c8c',
    fontSize: 14,
  },
  arrivalTime: {
    marginTop: 22,
    color: '#8c8c8c',
    fontSize: 24,
    fontWeight: '900',
  },
  routeRail: {
    width: 28,
    alignItems: 'center',
    paddingTop: 4,
  },
  blueDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: APP_COLORS.primaryDark,
    borderWidth: 5,
    borderColor: '#d9e9ff',
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
    paddingRight: 6,
  },
  originText: {
    color: '#111111',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  destinationText: {
    marginTop: 30,
    color: '#8d8d8d',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  priceColumn: {
    width: 104,
    alignItems: 'flex-end',
  },
  fromText: {
    color: '#888888',
    fontSize: 14,
  },
  price: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '900',
  },
  originalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  originalPrice: {
    color: '#8d8d8d',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  smallDiscount: {
    overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    color: APP_COLORS.surface,
    backgroundColor: '#ef5350',
    fontSize: 13,
    fontWeight: '800',
  },
  seatsLeft: {
    marginTop: 7,
    color: '#111111',
    fontSize: 16,
  },
  cardDivider: {
    height: 1,
    marginBottom: 16,
    backgroundColor: '#e2e2e2',
  },
  operatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripImage: {
    width: 84,
    height: 84,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadge: {
    marginTop: 4,
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  operatorInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 16,
  },
  operatorName: {
    color: '#000000',
    fontSize: 21,
    fontWeight: '900',
  },
  vehicleType: {
    marginTop: 6,
    color: '#111111',
    fontSize: 16,
  },
  moreTimeButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moreTimeText: {
    color: APP_COLORS.primaryDark,
    fontSize: 16,
    fontWeight: '800',
  },
  heartButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    minHeight: 210,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: APP_COLORS.surface,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
