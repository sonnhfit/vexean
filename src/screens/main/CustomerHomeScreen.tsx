import { ComponentProps, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { MainTabParamList, RootStackParamList } from '../../types/navigation';
import { getLinkedPhoneNumber } from '../../utils/userPhone';

type IconName = ComponentProps<typeof Ionicons>['name'];
type CustomerHomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'CustomerHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const recentSearches = [
  { from: 'Hồ Chí Minh', to: 'Bà Rịa-Vũng Tàu', date: 'T6, 19/09/2025' },
  { from: 'Hồ Chí Minh', to: 'Bà Rịa-Vũng Tàu', date: 'T7, 20/09/2025' },
];

const popularRoutes = [
  { title: 'Sapa', color: '#5c9f92' },
  { title: 'Hạ Long', color: '#4d8ea1' },
  { title: 'Đà Lạt', color: '#7b8f76' },
];

export function CustomerHomeScreen() {
  const navigation = useNavigation<CustomerHomeNavigation>();
  const user = useAppSelector(state => state.auth.user);
  const defaultPhone = getLinkedPhoneNumber(user);
  const displayName =
    user?.full_name || user?.first_name || user?.username || 'Quý khách';
  const [roundTrip, setRoundTrip] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
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
            <TransportTab icon="bus" label="Xe khách" active />
            <TransportTab icon="sparkles-outline" label="Limousine" />
            <TransportTab icon="ticket-outline" label="Ghế ngồi" />
            <TransportTab icon="bed-outline" label="Giường nằm" />
          </View>

          <View style={styles.routeBlock}>
            <View style={styles.routeDots}>
              <View style={styles.dotBlue} />
              <View style={styles.dotLine} />
              <View style={styles.dotRed} />
            </View>
            <View style={styles.routeFields}>
              <RouteField label="Nơi xuất phát" value="Hồ Chí Minh" />
              <View style={styles.divider} />
              <RouteField label="Bạn muốn đi đâu?" value="Bà Rịa-Vũng Tàu" />
            </View>
            <Pressable style={styles.swapButton}>
              <Ionicons name="swap-vertical" size={22} color="#555555" />
            </Pressable>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Ionicons name="calendar-outline" size={22} color={APP_COLORS.primaryDark} />
              <Text style={styles.dateLabel}>Ngày đi</Text>
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
          onPress={() =>
            navigation.navigate('TicketBooking', {
              initialPhone: defaultPhone,
              initialPassengerName: displayName,
            })
          }
        >
          <Text style={styles.searchButtonText}>Tìm kiếm</Text>
        </Pressable>

        <View style={styles.benefitRow}>
          <Benefit icon="shield-checkmark" text="Chắc chắn có chỗ" />
          <Benefit icon="headset" text="Hỗ trợ 24/7" />
          <Benefit icon="pricetag" text="Nhiều ưu đãi" />
          <Benefit icon="cash" text="Thanh toán đa dạng" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tìm kiếm gần đây</Text>
          <Pressable>
            <Text style={styles.clearText}>Xóa tất cả</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentList}
        >
          {recentSearches.map(item => (
            <View key={item.date} style={styles.recentCard}>
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
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Tuyến đường phổ biến</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularList}
        >
          {popularRoutes.map(route => (
            <View
              key={route.title}
              style={[styles.popularCard, { backgroundColor: route.color }]}
            >
              <Text style={styles.popularText}>{route.title}</Text>
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
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <View style={styles.transportTab}>
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
    </View>
  );
}

function RouteField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.routeField}>
      <Text style={styles.routeLabel}>{label}</Text>
      <Text style={styles.routeValue}>{value}</Text>
    </View>
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
