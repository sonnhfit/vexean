import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { VehicleDetailScreen } from '../screens/main/VehicleDetailScreen';
import { useAppSelector } from '../store/hooks';
import { APP_COLORS } from '../theme/colors';
import { RootStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { hydrated, accessToken } = useAppSelector(state => state.auth);

  if (!hydrated) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={APP_COLORS.primaryDark} />
      </View>
    );
  }

  const isAuthenticated = Boolean(accessToken);

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
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Hồ sơ cá nhân' }}
          />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = {
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.background,
  },
} as const;
