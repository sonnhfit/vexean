import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_COLORS } from '../../theme/colors';

export function CargoScreen() {
  return (
    <ScreenContainer
      title="Hàng hoá"
      subtitle="Theo dõi ký gửi, COD, quét QR và tổng hợp tiền trong ca"
    >
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Khung Cargo module MVP.</Text>
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
