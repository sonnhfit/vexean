import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

export function DashboardScreen() {
  return (
    <ScreenContainer
      title="Bảng điều khiển"
      subtitle="Theo dõi tổng quan vận hành chuyến, ghế, doanh thu và cảnh báo"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Khung Dashboard MVP.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: APP_COLORS.surface,
  },
  infoText: {
    color: APP_COLORS.textPrimary,
    fontSize: 15,
  },
});
