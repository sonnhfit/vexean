import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS } from '../../theme/colors';

export function CustomerNotificationsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>
      <View style={styles.tabStrip}>
        <View style={styles.tabItem}>
          <Text style={[styles.tabText, styles.tabTextActive]}>Chuyến đi</Text>
        </View>
        <View style={styles.tabItem}>
          <View style={styles.promoLabel}>
            <Text style={styles.tabText}>Khuyến mãi</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>33</Text>
            </View>
          </View>
        </View>
        <View style={styles.indicator} />
      </View>
      <View style={styles.body}>
        <View style={styles.emptyWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={APP_COLORS.surface} />
          </View>
          <View style={styles.shadow} />
          <Text style={styles.emptyTitle}>Bạn chưa đăng nhập</Text>
          <Text style={styles.emptyText}>
            Đăng nhập để xem thông báo về chuyến đi, điểm thưởng hoặc khuyến mãi.
          </Text>
          <Pressable style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
