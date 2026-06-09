import { Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

export function DashboardScreen() {
  return (
    <ScreenContainer
      title="Bảng điều khiển"
      subtitle="Theo dõi tổng quan vận hành chuyến, ghế, doanh thu và cảnh báo"
    >
      <Text>Khung Dashboard MVP.</Text>
    </ScreenContainer>
  );
}
