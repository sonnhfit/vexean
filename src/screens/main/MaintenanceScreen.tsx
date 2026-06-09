import { Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

export function MaintenanceScreen() {
  return (
    <ScreenContainer
      title="Bảo dưỡng"
      subtitle="Theo dõi km thực tế, lịch bảo trì và cảnh báo nhắc hạn"
    >
      <Text>Khung Maintenance module MVP.</Text>
    </ScreenContainer>
  );
}
