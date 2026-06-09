import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button, StyleSheet, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { APP_COLORS } from '../../theme/colors';
import { RootStackParamList } from '../../types/navigation';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export function AccountScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { signOut } = useAuth();

  return (
    <ScreenContainer title="Tài khoản" subtitle="Hồ sơ và quyền truy cập">
      <View style={styles.buttonGroup}>
        <Button title="Xem hồ sơ" onPress={() => navigation.navigate('Profile')} color={APP_COLORS.primaryDark} />
      </View>
      <Button title="Đăng xuất" onPress={signOut} color={APP_COLORS.primaryDark} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    marginBottom: 16,
  },
});
