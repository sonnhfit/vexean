import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import { AccountScreen } from '../screens/account/AccountScreen';
import { CargoScreen } from '../screens/main/CargoScreen';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { MaintenanceScreen } from '../screens/main/MaintenanceScreen';
import { PassengersScreen } from '../screens/main/PassengersScreen';
import { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function createTabBarIcon(activeIcon: IconName, inactiveIcon: IconName): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ color, size, focused }) => (
    <Ionicons name={focused ? activeIcon : inactiveIcon} size={size} color={color} />
  );
}

const dashboardIcon = createTabBarIcon('grid', 'grid-outline');
const passengersIcon = createTabBarIcon('people', 'people-outline');
const cargoIcon = createTabBarIcon('cube', 'cube-outline');
const maintenanceIcon = createTabBarIcon('construct', 'construct-outline');
const accountIcon = createTabBarIcon('person-circle', 'person-circle-outline');

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Bảng điều khiển', tabBarIcon: dashboardIcon }}
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
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: 'Bảo dưỡng', tabBarIcon: maintenanceIcon }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Tài khoản', tabBarIcon: accountIcon }}
      />
    </Tab.Navigator>
  );
}
