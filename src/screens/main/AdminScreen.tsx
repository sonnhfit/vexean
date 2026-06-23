import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];
type MenuItem = { label: string; icon: IconName };

const programItems: MenuItem[] = [
  { label: 'Giới thiệu Vexere, nhận hoa hồng', icon: 'megaphone-outline' },
  { label: 'Công cụ Marketing', icon: 'trending-up-outline' },
];

const managementItems: MenuItem[] = [
  { label: 'Điều hành xe trung chuyển', icon: 'car-outline' },
  { label: 'Quản lý nhân sự', icon: 'person-outline' },
  { label: 'Quản lý khách hàng', icon: 'people-outline' },
  { label: 'Quản lý đánh giá', icon: 'chatbox-ellipses-outline' },
  { label: 'Quản lý', icon: 'newspaper-outline' },
  { label: 'Quản lý ứng dụng hành khách', icon: 'shapes-outline' },
];

const settingsItems: MenuItem[] = [
  { label: 'Cài đặt ứng dụng', icon: 'apps-outline' },
  { label: 'Cài đặt chung', icon: 'settings-outline' },
  { label: 'Cài đặt hệ thống', icon: 'cog-outline' },
];

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(item => (
        <View key={item.label} style={styles.menuRow}>
          <Ionicons name={item.icon} size={27} color={APP_COLORS.primaryDark} />
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={24} color={APP_COLORS.textPrimary} />
        </View>
      ))}
    </View>
  );
}

export function AdminScreen() {
  const user = useAppSelector(state => state.auth.user);
  const displayName = user?.full_name || user?.username || 'Quản trị viên';

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={42} color={APP_COLORS.surface} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.role}>Chủ xe</Text>
          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
        </View>
      </View>

      <MenuSection title="Chương trình" items={programItems} />
      <MenuSection title="Danh mục" items={managementItems} />
      <MenuSection title="Cài đặt ứng dụng" items={settingsItems} />
      <Text style={styles.version}>Phiên bản 1.8.6 (v193)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.border,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 18,
  },
  role: {
    color: APP_COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  profileName: {
    marginTop: 4,
    color: APP_COLORS.primaryDark,
    fontSize: 18,
  },
  section: {
    marginHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.border,
  },
  sectionTitle: {
    color: APP_COLORS.placeholder,
    fontSize: 16,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 22,
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    lineHeight: 24,
  },
  version: {
    paddingVertical: 28,
    color: APP_COLORS.placeholder,
    fontSize: 14,
    textAlign: 'center',
  },
});
