import { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { signOut } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];
type MenuItem = {
  label: string;
  icon: IconName;
  screen: 'FleetManagement' | 'DriverManagement' | 'Passengers';
};
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

const managementItems: MenuItem[] = [
  { label: 'Điều hành xe trung chuyển', icon: 'car-outline', screen: 'FleetManagement' },
  { label: 'Quản lý nhân sự', icon: 'person-outline', screen: 'DriverManagement' },
  { label: 'Quản lý khách hàng', icon: 'people-outline', screen: 'Passengers' },
];

function MenuSection({ title, items, onPress }: { title: string; items: MenuItem[]; onPress: (item: MenuItem) => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(item => (
        <Pressable key={item.label} style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]} onPress={() => onPress(item)}>
          <Ionicons name={item.icon} size={27} color={APP_COLORS.primaryDark} />
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={24} color={APP_COLORS.textPrimary} />
        </Pressable>
      ))}
    </View>
  );
}

export function AdminScreen() {
  const navigation = useNavigation<RootNavigation>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const displayName = user?.full_name || user?.username || 'Quản trị viên';
  const openMenuItem = (item: MenuItem) => {
    navigation.navigate(item.screen);
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <Pressable style={({ pressed }) => [styles.profileRow, pressed && styles.menuRowPressed]} onPress={() => navigation.navigate('Profile')}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={42} color={APP_COLORS.surface} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.role}>Chủ xe</Text>
          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={APP_COLORS.textSecondary} />
      </Pressable>

      <MenuSection title="Quản lý" items={managementItems} onPress={openMenuItem} />
      <Pressable style={styles.signOutButton} onPress={() => dispatch(signOut())}>
        <Ionicons name="log-out-outline" size={20} color={APP_COLORS.danger} />
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </Pressable>
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
  menuRowPressed: { opacity: 0.55 },
  menuLabel: {
    flex: 1,
    marginLeft: 22,
    color: APP_COLORS.textPrimary,
    fontSize: 18,
    lineHeight: 24,
  },
  signOutButton: {
    minHeight: 54,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.dangerLight,
    borderRadius: 10,
    backgroundColor: APP_COLORS.dangerLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    color: APP_COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    paddingVertical: 28,
    color: APP_COLORS.placeholder,
    fontSize: 14,
    textAlign: 'center',
  },
});
