import { ComponentProps, useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

const metrics: Array<{ label: string; value: string; note: string; icon: IconName }> = [
  { label: 'Chuyến chạy', value: '18', note: '+3', icon: 'bus-outline' },
  { label: 'Lấp đầy', value: '79%', note: '412/520 ghế', icon: 'people-outline' },
  { label: 'Doanh thu', value: '248.4M', note: 'Hôm nay', icon: 'cash-outline' },
  { label: 'Cảnh báo', value: '7', note: '2 mức cao', icon: 'warning-outline' },
];

const dispatchBoard = [
  {
    route: 'SGN → Cần Thơ',
    pickupWindow: '06:30 - 07:00',
    seats: '34/40',
    status: 'Sẵn sàng',
    tone: 'success' as const,
  },
  {
    route: 'SGN → Đà Lạt',
    pickupWindow: '07:10 - 07:40',
    seats: '40/40',
    status: 'Đầy chỗ',
    tone: 'info' as const,
  },
  {
    route: 'SGN → Phan Thiết',
    pickupWindow: '08:00 - 08:30',
    seats: '27/34',
    status: 'Thiếu điểm đón',
    tone: 'warning' as const,
  },
];

const monitoringFeed = [
  {
    level: 'Cao',
    vehicle: '51B-238.90',
    message: 'Vào geofence ngoài kế hoạch',
    channel: 'Telegram',
    time: '09:12',
    tone: 'danger' as const,
  },
  {
    level: 'Trung bình',
    vehicle: '62F-112.21',
    message: 'Sai lệch GPS 2.1km',
    channel: 'Zalo OA',
    time: '09:05',
    tone: 'warning' as const,
  },
  {
    level: 'Thấp',
    vehicle: '50H-556.78',
    message: 'Check-in trễ 8 phút',
    channel: 'Trung tâm điều phối',
    time: '08:58',
    tone: 'info' as const,
  },
];

const toneColors = {
  success: { bg: APP_COLORS.successLight, text: APP_COLORS.success },
  info: { bg: APP_COLORS.infoLight, text: APP_COLORS.info },
  warning: { bg: APP_COLORS.warningLight, text: APP_COLORS.warning },
  danger: { bg: APP_COLORS.dangerLight, text: APP_COLORS.danger },
};

function sectionHeader(icon: IconName, title: string) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={APP_COLORS.primaryDark} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  return (
    <ScreenContainer
      title="Trang chủ"
      subtitle="Tổng quan vận hành theo thời gian thực"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primaryDark}
            colors={[APP_COLORS.primaryDark, APP_COLORS.info]}
          />
        }
      >
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroLabel}>Hiệu suất hôm nay</Text>
            <Text style={styles.heroValue}>79%</Text>
          </View>
          <View style={styles.heroRight}>
            <Ionicons name="trending-up-outline" size={20} color={APP_COLORS.primaryDark} />
            <Text style={styles.heroChange}>+4.2%</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <View style={styles.quickAction}>
            <Ionicons name="git-network-outline" size={14} color={APP_COLORS.primaryDark} />
            <Text style={styles.quickActionText}>Điều phối</Text>
          </View>
          <View style={styles.quickAction}>
            <Ionicons name="checkmark-circle-outline" size={14} color={APP_COLORS.primaryDark} />
            <Text style={styles.quickActionText}>Check-in</Text>
          </View>
          <View style={styles.quickAction}>
            <Ionicons name="notifications-outline" size={14} color={APP_COLORS.primaryDark} />
            <Text style={styles.quickActionText}>Cảnh báo</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <Ionicons name={item.icon} size={16} color={APP_COLORS.primaryDark} />
              </View>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricNote}>{item.note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          {sectionHeader('map-outline', 'Điều phối chuyến')}
          {dispatchBoard.map((trip) => (
            <View key={`${trip.route}-${trip.pickupWindow}`} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{trip.route}</Text>
                <Text style={styles.rowSeats}>{trip.seats}</Text>
              </View>
              <Text style={styles.rowSub}>{trip.pickupWindow}</Text>
              <View style={[styles.rowStatusWrap, { backgroundColor: toneColors[trip.tone].bg }] }>
                <Ionicons name="ellipse" size={8} color={toneColors[trip.tone].text} />
                <Text style={[styles.rowStatus, { color: toneColors[trip.tone].text }]}>{trip.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          {sectionHeader('radio-outline', 'Cảnh báo realtime')}
          {monitoringFeed.map((alert) => (
            <View key={`${alert.vehicle}-${alert.time}`} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertVehicle}>{alert.vehicle}</Text>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              <View style={[styles.alertLevelWrap, { backgroundColor: toneColors[alert.tone].bg }] }>
                <Ionicons name="warning-outline" size={12} color={toneColors[alert.tone].text} />
                <Text style={[styles.alertLevel, { color: toneColors[alert.tone].text }]}>{alert.level}</Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertChannel}>{alert.channel}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 24,
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.primaryLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroValue: {
    color: APP_COLORS.primaryDark,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChange: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickActionText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    color: APP_COLORS.primaryDark,
    fontSize: 21,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 4,
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  metricNote: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  rowCard: {
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSeats: {
    color: APP_COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    marginTop: 3,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  rowStatusWrap: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: APP_COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rowStatus: {
    color: APP_COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  alertCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertVehicle: {
    color: APP_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  alertTime: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
  alertLevelWrap: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: APP_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alertLevel: {
    color: APP_COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  alertMessage: {
    marginTop: 2,
    color: APP_COLORS.textPrimary,
    fontSize: 12,
  },
  alertChannel: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
});
