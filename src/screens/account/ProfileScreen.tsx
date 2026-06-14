import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAppSelector } from '../../store/hooks';
import { APP_COLORS } from '../../theme/colors';
import { getLinkedPhoneNumber, isUsernamePhoneNumber } from '../../utils/userPhone';

export function ProfileScreen() {
  const user = useAppSelector(state => state.auth.user);
  const linkedPhone = getLinkedPhoneNumber(user);

  return (
    <ScreenContainer title="Hồ sơ" subtitle="Thông tin cá nhân và vai trò vận hành">
      <View style={styles.card}>
        <Text style={styles.row}>Họ tên: {user?.full_name || '-'}</Text>
        <Text style={styles.row}>Vai trò: {user?.role_display || user?.role || '-'}</Text>
        <Text style={styles.row}>Tài khoản: {user?.username || '-'}</Text>
        <Text style={styles.row}>
          SĐT liên kết: {linkedPhone || 'Chưa có'}
        </Text>
        {!linkedPhone && user?.username && !isUsernamePhoneNumber(user) ? (
          <Text style={styles.warningText}>
            Cần cập nhật SĐT đã xác minh vào hồ
            sơ khách hàng để xem vé và đơn gửi hàng.
          </Text>
        ) : null}
        <Text style={styles.row}>Email: {user?.email || '-'}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.primaryLight,
    borderRadius: 12,
    padding: 14,
  },
  row: {
    fontSize: 16,
    marginBottom: 8,
    color: APP_COLORS.textPrimary,
  },
  warningText: {
    marginBottom: 8,
    color: APP_COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
