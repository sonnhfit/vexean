import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

const tripLogs = [
  { id: 'TL-9821', route: 'SGN → Cần Thơ', completedAt: '08:45', status: 'Tự động', tone: 'success' as const },
  { id: 'TL-9822', route: 'SGN → Đà Lạt', completedAt: '09:00', status: 'Đã đối chiếu GPS', tone: 'info' as const },
  { id: 'TL-9823', route: 'SGN → Phan Thiết', completedAt: '09:12', status: 'Chờ chi phí', tone: 'warning' as const },
];

const reconciliation = [
  { period: 'Ca sáng 09/06', ticketRevenue: '184,500,000đ', codFlow: '22,700,000đ', diff: '0đ', tone: 'success' as const },
  { period: 'Ca chiều 08/06', ticketRevenue: '176,200,000đ', codFlow: '18,950,000đ', diff: '120,000đ', tone: 'warning' as const },
];

const maintenanceReminders = [
  { vehicle: '51B-238.90', currentKm: '129,420 km', threshold: '130,000 km', status: 'Còn 580 km', tone: 'info' as const },
  { vehicle: '62F-112.21', currentKm: '89,910 km', threshold: '90,000 km', status: 'Còn 90 km • Ưu tiên', tone: 'warning' as const },
  { vehicle: '50H-556.78', currentKm: '145,030 km', threshold: '145,000 km', status: 'Quá hạn 30 km', tone: 'danger' as const },
];

const toneColors = {
  success: { bg: APP_COLORS.successLight, text: APP_COLORS.success },
  info: { bg: APP_COLORS.infoLight, text: APP_COLORS.info },
  warning: { bg: APP_COLORS.warningLight, text: APP_COLORS.warning },
  danger: { bg: APP_COLORS.dangerLight, text: APP_COLORS.danger },
};

export function MaintenanceScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  return (
    <ScreenContainer
      title="Bảo dưỡng"
      subtitle="Trip log, đối soát và nhắc hạn theo km"
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
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trip Log tự động</Text>
          {tripLogs.map((log) => (
            <View key={log.id} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{log.id}</Text>
                <Text style={styles.rowTime}>{log.completedAt}</Text>
              </View>
              <Text style={styles.rowMeta}>{log.route}</Text>
              <Text style={[styles.statusChip, { color: toneColors[log.tone].text, backgroundColor: toneColors[log.tone].bg }]}>
                {log.status}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Đối soát vé & COD</Text>
          {reconciliation.map((entry) => (
            <View key={entry.period} style={styles.reconcileCard}>
              <Text style={styles.rowTitle}>{entry.period}</Text>
              <Text style={styles.rowMeta}>Vé: {entry.ticketRevenue}</Text>
              <Text style={styles.rowMeta}>COD: {entry.codFlow}</Text>
              <Text style={[styles.diffText, { color: toneColors[entry.tone].text }]}>Lệch: {entry.diff}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Nhắc bảo dưỡng</Text>
          {maintenanceReminders.map((item) => (
            <View key={item.vehicle} style={styles.reminderCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{item.vehicle}</Text>
                <Text style={styles.thresholdText}>{item.threshold}</Text>
              </View>
              <Text style={styles.rowMeta}>{item.currentKm}</Text>
              <Text style={[styles.statusText, { color: toneColors[item.tone].text }]}>{item.status}</Text>
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
  sectionCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  sectionTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
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
  rowTime: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  rowMeta: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  reconcileCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  reminderCard: {
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  thresholdText: {
    color: APP_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
