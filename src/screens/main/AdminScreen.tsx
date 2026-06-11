import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

const adminQuickActions = [
  { label: 'Quản lý tài khoản', icon: 'people-outline' as const, note: 'Phân quyền và trạng thái người dùng' },
  { label: 'Quản lý lịch hẹn', icon: 'calendar-outline' as const, note: 'Kiểm soát toàn bộ lịch trong hệ thống' },
  { label: 'Quản lý xe', icon: 'bus-outline' as const, note: 'Theo dõi đội xe, trạng thái và lịch vận hành' },
  { label: 'Quản lý tài xế', icon: 'id-card-outline' as const, note: 'Quản lý hồ sơ tài xế và phân ca chạy' },
  { label: 'Quản lý nhân viên', icon: 'people-circle-outline' as const, note: 'Quản lý thông tin nhân sự và phân quyền phòng ban' },
  { label: 'Quản lý báo cáo', icon: 'stats-chart-outline' as const, note: 'Theo dõi KPI và cảnh báo vận hành' },
];

export function AdminScreen() {
  return (
    <ScreenContainer title="Quản trị" subtitle="Công cụ dành cho quản trị viên hệ thống">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={20} color={APP_COLORS.primaryDark} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Bảng điều khiển quản trị</Text>
            <Text style={styles.heroSubtitle}>Bạn đang có quyền truy cập đầy đủ vào các tính năng quản lý hệ thống.</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chức năng chính</Text>
          {adminQuickActions.map(item => (
            <View key={item.label} style={styles.actionRow}>
              <View style={styles.actionIconWrap}>
                <Ionicons name={item.icon} size={16} color={APP_COLORS.primaryDark} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Text style={styles.actionNote}>{item.note}</Text>
              </View>
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
    gap: 10,
    alignItems: 'flex-start',
  },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 4,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primaryLight,
    marginTop: 2,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  actionNote: {
    marginTop: 2,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
  },
});
