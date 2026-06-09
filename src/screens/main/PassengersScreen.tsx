import { Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';

export function PassengersScreen() {
  return (
    <ScreenContainer
      title="Hành khách"
      subtitle="Quản lý danh sách vé, check-in và dữ liệu hành khách theo chuyến"
    >
      <Text>Khung Passenger module MVP.</Text>
    </ScreenContainer>
  );
}
