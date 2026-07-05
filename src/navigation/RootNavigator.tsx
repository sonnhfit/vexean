import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountDetailScreen } from '../screens/account/AccountDetailScreen';
import { EditProfileScreen } from '../screens/account/EditProfileScreen';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { CustomerLocationSearchScreen } from '../screens/main/CustomerLocationSearchScreen';
import { TicketBookingScreen } from '../screens/main/TicketBookingScreen';
import { TicketSearchResultsScreen } from '../screens/main/TicketSearchResultsScreen';
import { VehicleDetailScreen } from '../screens/main/VehicleDetailScreen';
import { DriverManagementScreen } from '../screens/main/DriverManagementScreen';
import { FleetManagementScreen } from '../screens/main/FleetManagementScreen';
import { MaintenanceScreen } from '../screens/main/MaintenanceScreen';
import { PassengersScreen } from '../screens/main/PassengersScreen';
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
        headerBackButtonDisplayMode: 'minimal',
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
            options={{
              title: 'Hồ sơ cá nhân',
              headerBackVisible: true,
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: 'Chỉnh sửa hồ sơ' }}
          />
          <Stack.Screen
            name="AccountDetail"
            component={AccountDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketBooking"
            component={TicketBookingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketSearchResults"
            component={TicketSearchResultsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CustomerLocationSearch"
            component={CustomerLocationSearchScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="FleetManagement" component={FleetManagementScreen} options={{ title: 'Điều hành xe trung chuyển' }} />
          <Stack.Screen name="DriverManagement" component={DriverManagementScreen} options={{ title: 'Quản lý nhân sự' }} />
          <Stack.Screen name="Passengers" component={PassengersScreen} options={{ title: 'Quản lý khách hàng' }} />
          <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Bảo dưỡng' }} />
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

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.background,
  },
});
