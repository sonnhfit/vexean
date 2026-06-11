import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { signOut } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export function AccountScreen() {
  const navigation = useNavigation<RootNavigation>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const roleLabel = user?.role_display || user?.role || 'Chưa xác định';

  return (
    <ScreenContainer title="Tài khoản" subtitle="Hồ sơ và quyền truy cập">
      <View style={styles.roleCard}>
        <Text style={styles.roleTitle}>Vai trò đang đăng nhập</Text>
        <Text style={styles.roleValue}>{roleLabel}</Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button title="Xem hồ sơ" onPress={() => navigation.navigate('Profile')} color={APP_COLORS.primaryDark} />
      </View>
      <Button title="Đăng xuất" onPress={() => dispatch(signOut())} color={APP_COLORS.primaryDark} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  roleCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  roleTitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  roleValue: {
    color: APP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonGroup: {
    marginBottom: 16,
  },
});
