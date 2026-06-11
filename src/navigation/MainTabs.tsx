import { ComponentProps } from 'react';
import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import { AccountScreen } from '../screens/account/AccountScreen';
import { useAppSelector } from '../store/hooks';
import { AdminScreen } from '../screens/main/AdminScreen';
import { CallCenterScreen } from '../screens/main/CallCenterScreen';
import { CargoScreen } from '../screens/main/CargoScreen';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { MaintenanceScreen } from '../screens/main/MaintenanceScreen';
import { PassengersScreen } from '../screens/main/PassengersScreen';
import { APP_COLORS } from '../theme/colors';
import { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = ComponentProps<typeof Ionicons>['name'];

function createTabBarIcon(activeIcon: IconName, inactiveIcon: IconName): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ color, size, focused }) => (
    <Ionicons name={focused ? activeIcon : inactiveIcon} size={size} color={color} />
  );
}

const dashboardIcon = createTabBarIcon('grid', 'grid-outline');
const passengersIcon = createTabBarIcon('people', 'people-outline');
const cargoIcon = createTabBarIcon('cube', 'cube-outline');
const maintenanceIcon = createTabBarIcon('construct', 'construct-outline');
const adminIcon = createTabBarIcon('shield-half', 'shield-outline');
const callCenterIcon = createTabBarIcon('headset', 'headset-outline');
const accountIcon = createTabBarIcon('person-circle', 'person-circle-outline');

export function MainTabs() {
  const user = useAppSelector(state => state.auth.user);
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: APP_COLORS.primary },
        headerTintColor: APP_COLORS.surface,
        tabBarActiveTintColor: APP_COLORS.primary,
        tabBarInactiveTintColor: APP_COLORS.textSecondary,
        tabBarStyle: {
          borderTopColor: APP_COLORS.border,
          backgroundColor: APP_COLORS.surface,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Trang chủ', tabBarIcon: dashboardIcon }}
      />
      <Tab.Screen
        name="Passengers"
        component={PassengersScreen}
        options={{ title: 'Hành khách', tabBarIcon: passengersIcon }}
      />
      <Tab.Screen
        name="Cargo"
        component={CargoScreen}
        options={{ title: 'Hàng hoá', tabBarIcon: cargoIcon }}
      />
      {isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: 'Quản trị', tabBarIcon: adminIcon }}
        />
      ) : (
        <Tab.Screen
          name="Maintenance"
          component={MaintenanceScreen}
          options={{ title: 'Bảo dưỡng', tabBarIcon: maintenanceIcon }}
        />
      )}
      <Tab.Screen
        name="CallCenter"
        component={CallCenterScreen}
        options={{ title: 'Tổng Đài', tabBarIcon: callCenterIcon }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Tài khoản', tabBarIcon: accountIcon }}
      />
    </Tab.Navigator>
  );
}
