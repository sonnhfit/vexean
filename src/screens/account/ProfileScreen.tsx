import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

export function ProfileScreen() {
  return (
    <ScreenContainer title="Hồ sơ" subtitle="Thông tin cá nhân và vai trò vận hành">
      <View style={styles.card}>
        <Text style={styles.row}>Họ tên: Nguyễn Văn A</Text>
        <Text style={styles.row}>Vai trò: Điều hành</Text>
        <Text style={styles.row}>Mã nhân sự: HRM-001</Text>
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
});
