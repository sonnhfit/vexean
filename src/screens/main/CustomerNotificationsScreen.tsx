import { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

type MockNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: IconName;
  color: string;
  unread?: boolean;
};

const mockTripNotifications: MockNotification[] = [
  {
    id: 'trip-confirmed',
    title: 'Vé Hà Nội - Sa Pa đã được giữ chỗ',
    message: 'HK BUSLINES khởi hành 23:45 hôm nay. Vui lòng có mặt trước 20 phút.',
    time: '5 phút trước',
    icon: 'ticket-outline',
    color: APP_COLORS.primaryDark,
    unread: true,
  },
  {
    id: 'pickup-reminder',
    title: 'Nhắc lịch đón khách',
    message: 'Xe sẽ đón tại Văn phòng 70 Nguyễn Hữu Huân lúc 23:45.',
    time: '32 phút trước',
    icon: 'location-outline',
    color: APP_COLORS.info,
    unread: true,
  },
  {
    id: 'payment-success',
    title: 'Thanh toán thành công',
    message: 'Đơn hàng VX240617 đã được thanh toán. Cảm ơn bạn đã chọn An Nhiên.',
    time: 'Hôm qua',
    icon: 'card-outline',
    color: APP_COLORS.success,
  },
];

const mockPromoNotifications: MockNotification[] = [
  {
    id: 'promo-sapa',
    title: 'Ưu đãi tuyến Sa Pa',
    message: 'Giảm 50%, tối đa 250k cho một số khung giờ tối nay.',
    time: '2 giờ trước',
    icon: 'pricetag-outline',
    color: APP_COLORS.warning,
    unread: true,
  },
  {
    id: 'promo-limo',
    title: 'Limousine cuối tuần',
    message: 'Đặt sớm vé limousine để nhận thêm mã giảm giá cho chuyến kế tiếp.',
    time: '3 ngày trước',
    icon: 'sparkles-outline',
    color: APP_COLORS.primaryDark,
  },
];

export function CustomerNotificationsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const isLoggedIn = Boolean(user);
  const unreadTripCount = mockTripNotifications.filter(item => item.unread).length;
  const unreadPromoCount = mockPromoNotifications.filter(item => item.unread).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>
      <View style={styles.tabStrip}>
        <View style={styles.tabItem}>
          <View style={styles.promoLabel}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Chuyến đi</Text>
            {isLoggedIn && unreadTripCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadTripCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.tabItem}>
          <View style={styles.promoLabel}>
            <Text style={styles.tabText}>Khuyến mãi</Text>
            {isLoggedIn && unreadPromoCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadPromoCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.indicator} />
      </View>
      <View style={styles.body}>
        {isLoggedIn ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationList}
          >
            <Text style={styles.listTitle}>Thông báo chuyến đi</Text>
            {mockTripNotifications.map(item => (
              <NotificationCard key={item.id} notification={item} />
            ))}

            <Text style={[styles.listTitle, styles.promoTitle]}>Khuyến mãi</Text>
            {mockPromoNotifications.map(item => (
              <NotificationCard key={item.id} notification={item} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={APP_COLORS.surface} />
            </View>
            <View style={styles.shadow} />
            <Text style={styles.emptyTitle}>Bạn chưa đăng nhập</Text>
            <Text style={styles.emptyText}>
              Đăng nhập để xem thông báo về chuyến đi, điểm thưởng hoặc khuyến mãi.
            </Text>
            <Pressable
              style={styles.loginButton}
              onPress={() => dispatch(signOut())}
            >
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function NotificationCard({
  notification,
}: {
  notification: MockNotification;
}) {
  return (
    <Pressable style={styles.notificationCard}>
      <View
        style={[
          styles.notificationIcon,
          { backgroundColor: `${notification.color}1A` },
        ]}
      >
        <Ionicons
          name={notification.icon}
          size={22}
          color={notification.color}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationTitleRow}>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {notification.title}
          </Text>
          {notification.unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>{notification.time}</Text>
      </View>
    </Pressable>
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
  tabStrip: {
    height: 56,
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#dfdfdf',
    backgroundColor: APP_COLORS.surface,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#8b8b8b',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#111111',
  },
  promoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    backgroundColor: '#d9a94f',
  },
  badgeText: {
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -2,
    width: '50%',
    height: 3,
    backgroundColor: APP_COLORS.primaryDark,
  },
  body: {
    flex: 1,
    backgroundColor: '#f6f7f5',
  },
  notificationList: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  listTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  promoTitle: {
    marginTop: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: '#111111',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: APP_COLORS.primaryDark,
  },
  notificationMessage: {
    marginTop: 5,
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  notificationTime: {
    marginTop: 8,
    color: APP_COLORS.placeholder,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 104,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8fc9c7',
  },
  shadow: {
    width: 48,
    height: 8,
    borderRadius: 999,
    marginTop: 14,
    marginBottom: 24,
    backgroundColor: '#dedede',
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#555555',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loginButton: {
    alignSelf: 'stretch',
    minHeight: 52,
    borderRadius: 10,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123b70',
  },
  loginButtonText: {
    color: APP_COLORS.surface,
    fontSize: 17,
    fontWeight: '700',
  },
});
