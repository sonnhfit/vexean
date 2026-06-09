import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { APP_COLORS } from '../theme/colors';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: APP_COLORS.primary },
        headerTintColor: APP_COLORS.surface,
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ cá nhân' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Đăng nhập' }} />
      )}
    </Stack.Navigator>
  );
}
