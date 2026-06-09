import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

export function PassengersScreen() {
  return (
    <ScreenContainer
      title="Hành khách"
      subtitle="Quản lý danh sách vé, check-in và dữ liệu hành khách theo chuyến"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Khung Passenger module MVP.</Text>
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
