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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import { requestJson } from '../../services/apiClient';
import { signOut } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

type CustomerNotificationCategory = 'trip' | 'promotion' | 'payment' | 'system' | string;

type CustomerNotification = {
  id: number;
  category: CustomerNotificationCategory;
  type: string;
  title: string;
  message: string;
  icon?: string | null;
  color?: string | null;
  read_at: string | null;
  created_at: string;
  data?: Record<string, unknown> | null;
};

type NotificationUnreadCounts = {
  trip: number;
  promotion: number;
  payment: number;
  system: number;
  total: number;
};

type NotificationsResponse = {
  count: number;
  limit: number;
  offset: number;
  unread_counts: NotificationUnreadCounts;
  results: CustomerNotification[];
};

type NotificationTab = 'trip' | 'promotion';
type CountableNotificationCategory = keyof Omit<NotificationUnreadCounts, 'total'>;

const emptyUnreadCounts: NotificationUnreadCounts = {
  trip: 0,
  promotion: 0,
  payment: 0,
  system: 0,
  total: 0,
};

function isPromotionNotification(notification: CustomerNotification) {
  return notification.category === 'promotion';
}

function countableCategory(
  category: CustomerNotificationCategory,
): CountableNotificationCategory | null {
  return ['trip', 'promotion', 'payment', 'system'].includes(category)
    ? (category as CountableNotificationCategory)
    : null;
}

function notificationIcon(notification: CustomerNotification): IconName {
  if (notification.icon) {
    return notification.icon as IconName;
  }

  if (notification.category === 'promotion') {
    return 'pricetag-outline';
  }
  if (notification.category === 'payment') {
    return 'card-outline';
  }
  if (notification.type.includes('pickup')) {
    return 'location-outline';
  }
  if (notification.category === 'system') {
    return 'notifications-outline';
  }
  return 'ticket-outline';
}

function notificationColor(notification: CustomerNotification) {
  if (notification.color) {
    return notification.color;
  }

  if (notification.category === 'promotion') {
    return APP_COLORS.warning;
  }
  if (notification.category === 'payment') {
    return APP_COLORS.success;
  }
  if (notification.category === 'system') {
    return APP_COLORS.info;
  }
  return APP_COLORS.primaryDark;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) {
    return 'Vừa xong';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  if (diffHours < 48) {
    return 'Hôm qua';
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CustomerNotificationsScreen() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const user = useAppSelector(state => state.auth.user);
  const isLoggedIn = Boolean(user);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCounts, setUnreadCounts] =
    useState<NotificationUnreadCounts>(emptyUnreadCounts);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NotificationTab>('trip');

  const loadNotifications = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!isLoggedIn) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const data = await requestJson<NotificationsResponse>(
          '/api/nhaxe/customer/notifications/?limit=50&offset=0',
          {
            method: 'GET',
            auth: true,
            logLabel: 'customer-notifications',
          },
        );
        setNotifications(data.results || []);
        setUnreadCounts(data.unread_counts || emptyUnreadCounts);
      } catch (notificationsError) {
        const message =
          notificationsError instanceof Error
            ? notificationsError.message
            : 'Không tải được thông báo.';
        setError(message);
        showToast({
          type: 'error',
          title: 'Không tải được thông báo',
          message,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLoggedIn, showToast],
  );

  useEffect(() => {
    loadNotifications('initial');
  }, [loadNotifications]);

  const tripNotifications = useMemo(
    () =>
      notifications.filter(
        item => !isPromotionNotification(item),
      ),
    [notifications],
  );
  const promoNotifications = useMemo(
    () => notifications.filter(isPromotionNotification),
    [notifications],
  );
  const unreadTripCount =
    unreadCounts.trip + unreadCounts.payment + unreadCounts.system;
  const unreadPromoCount = unreadCounts.promotion;
  const activeNotifications =
    activeTab === 'trip' ? tripNotifications : promoNotifications;
  const activeEmptyText =
    activeTab === 'trip'
      ? 'Chưa có thông báo chuyến đi.'
      : 'Chưa có khuyến mãi mới.';
  const activeListTitle =
    activeTab === 'trip' ? 'Thông báo chuyến đi' : 'Khuyến mãi';

  const markNotificationRead = async (notification: CustomerNotification) => {
    if (notification.read_at) {
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications(current =>
      current.map(item =>
        item.id === notification.id ? { ...item, read_at: readAt } : item,
      ),
    );
    const category = countableCategory(notification.category);
    setUnreadCounts(current => {
      if (!category) {
        return {
          ...current,
          total: Math.max(0, current.total - 1),
        };
      }

      return {
        ...current,
        [category]: Math.max(0, current[category] - 1),
        total: Math.max(0, current.total - 1),
      };
    });

    try {
      const data = await requestJson<{ id: number; read_at: string }>(
        `/api/nhaxe/customer/notifications/${notification.id}/read/`,
        {
          method: 'PATCH',
          auth: true,
          logLabel: 'customer-notification-read',
        },
      );
      setNotifications(current =>
        current.map(item =>
          item.id === notification.id
            ? { ...item, read_at: data.read_at || readAt }
            : item,
        ),
      );
    } catch {
      loadNotifications('refresh');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>
      <View style={styles.tabStrip}>
        <Pressable
          style={styles.tabItem}
          onPress={() => setActiveTab('trip')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'trip' }}
        >
          <View style={styles.promoLabel}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'trip' && styles.tabTextActive,
              ]}
            >
              Chuyến đi
            </Text>
            {isLoggedIn && unreadTripCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadTripCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          style={styles.tabItem}
          onPress={() => setActiveTab('promotion')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'promotion' }}
        >
          <View style={styles.promoLabel}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'promotion' && styles.tabTextActive,
              ]}
            >
              Khuyến mãi
            </Text>
            {isLoggedIn && unreadPromoCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadPromoCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <View
          style={[
            styles.indicator,
            activeTab === 'promotion' && styles.indicatorPromotion,
          ]}
        />
      </View>
      <View style={styles.body}>
        {isLoggedIn ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications('refresh')}
                tintColor={APP_COLORS.primaryDark}
                colors={[APP_COLORS.primaryDark, APP_COLORS.info]}
              />
            }
          >
            {loading ? (
              <View style={styles.stateCard}>
                <ActivityIndicator size="large" color={APP_COLORS.primaryDark} />
                <Text style={styles.stateText}>Đang tải thông báo...</Text>
              </View>
            ) : null}

            {!loading && error ? (
              <View style={styles.stateCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={34}
                  color={APP_COLORS.danger}
                />
                <Text style={styles.stateTitle}>Không tải được thông báo</Text>
                <Text style={styles.stateText}>{error}</Text>
                <Pressable
                  style={styles.retryButton}
                  onPress={() => loadNotifications('initial')}
                >
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.listTitle}>{activeListTitle}</Text>
            {!loading && !error && activeNotifications.length ? (
              activeNotifications.map(item => (
                <NotificationCard
                  key={item.id}
                  notification={item}
                  onPress={() => markNotificationRead(item)}
                />
              ))
            ) : !loading && !error ? (
              <Text style={styles.emptyListText}>{activeEmptyText}</Text>
            ) : null}
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
  onPress,
}: {
  notification: CustomerNotification;
  onPress: () => void;
}) {
  const color = notificationColor(notification);
  const unread = !notification.read_at;

  return (
    <Pressable style={styles.notificationCard} onPress={onPress}>
      <View
        style={[
          styles.notificationIcon,
          { backgroundColor: `${color}1A` },
        ]}
      >
        <Ionicons
          name={notificationIcon(notification)}
          size={22}
          color={color}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationTitleRow}>
          <Text style={styles.notificationTitle} numberOfLines={2}>
            {notification.title}
          </Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatNotificationTime(notification.created_at)}
        </Text>
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
  indicatorPromotion: {
    left: '50%',
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
  stateCard: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    padding: 18,
    backgroundColor: APP_COLORS.surface,
  },
  stateTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 104,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryDark,
  },
  retryText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  listTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyListText: {
    color: APP_COLORS.placeholder,
    fontSize: 14,
    lineHeight: 20,
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
