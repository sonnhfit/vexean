import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button, StyleSheet, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../types/navigation';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

export function AccountScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { signOut } = useAuth();

  return (
    <ScreenContainer title="Tài khoản" subtitle="Thông tin tài khoản vận hành và quyền truy cập">
      <View style={styles.buttonGroup}>
        <Button title="Xem hồ sơ" onPress={() => navigation.navigate('Profile')} />
      </View>
      <Button title="Đăng xuất" onPress={signOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    marginBottom: 16,
  },
});
