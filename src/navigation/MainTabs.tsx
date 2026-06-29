import { ComponentProps } from 'react';
import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import { AccountScreen } from '../screens/account/AccountScreen';
import { useAppSelector } from '../store/hooks';
import { AdminScreen } from '../screens/main/AdminScreen';
import { AdminBookingScreen } from '../screens/main/AdminBookingScreen';
import { CallCenterScreen } from '../screens/main/CallCenterScreen';
import { CargoScreen } from '../screens/main/CargoScreen';
import { CustomerFavoritesScreen } from '../screens/main/CustomerFavoritesScreen';
import { CustomerHomeScreen } from '../screens/main/CustomerHomeScreen';
import { CustomerNotificationsScreen } from '../screens/main/CustomerNotificationsScreen';
import { CustomerTicketScreen } from '../screens/main/CustomerTicketScreen';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { DriverCargoScreen } from '../screens/main/DriverCargoScreen';
import { DriverTripsScreen } from '../screens/main/DriverTripsScreen';
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
const customerHomeIcon = createTabBarIcon('search', 'search-outline');
const customerOrdersIcon = createTabBarIcon('receipt', 'receipt-outline');
const customerFavoritesIcon = createTabBarIcon('heart', 'heart-outline');
const customerNotificationsIcon = createTabBarIcon('notifications', 'notifications-outline');
const passengersIcon = createTabBarIcon('people', 'people-outline');
const cargoIcon = createTabBarIcon('cube', 'cube-outline');
const maintenanceIcon = createTabBarIcon('construct', 'construct-outline');
const callCenterIcon = createTabBarIcon('headset', 'headset-outline');
const accountIcon = createTabBarIcon('person-circle', 'person-circle-outline');
const ticketBookingIcon = createTabBarIcon('apps', 'apps-outline');
const ticketReceivedIcon = createTabBarIcon('ticket', 'ticket-outline');
const scheduleIcon = createTabBarIcon('bus', 'bus-outline');
const menuIcon = createTabBarIcon('menu', 'menu-outline');

export function MainTabs() {
  const user = useAppSelector(state => state.auth.user);
  const role = (user?.user_role?.role || user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isDriver = role === 'driver' || role === 'taixe' || role === 'tai_xe';
  const isCallCenter = role === 'callcenter' || role === 'call_center' || role === 'tongdai' || role === 'tong_dai';
  const isCustomer =
    role === 'customer' ||
    role === 'client' ||
    role === 'passenger' ||
    role === 'khachhang' ||
    role === 'khach_hang';

  if (isCustomer) {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: APP_COLORS.primaryDark,
          tabBarInactiveTintColor: APP_COLORS.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          tabBarStyle: {
            borderTopColor: APP_COLORS.border,
            backgroundColor: APP_COLORS.surface,
            minHeight: 62,
            paddingTop: 5,
            paddingBottom: 6,
          },
        }}
      >
        <Tab.Screen
          name="CustomerHome"
          component={CustomerHomeScreen}
          options={{ title: 'Tìm kiếm', tabBarIcon: customerHomeIcon }}
        />
        <Tab.Screen
          name="CustomerOrders"
          component={CustomerTicketScreen}
          options={{ title: 'Đơn hàng', tabBarIcon: customerOrdersIcon }}
        />
        <Tab.Screen
          name="CustomerFavorites"
          component={CustomerFavoritesScreen}
          options={{ title: 'Yêu thích', tabBarIcon: customerFavoritesIcon }}
        />
        <Tab.Screen
          name="CustomerNotifications"
          component={CustomerNotificationsScreen}
          options={{ title: 'Thông báo', tabBarIcon: customerNotificationsIcon }}
        />
        <Tab.Screen
          name="Account"
          component={AccountScreen}
          options={{ title: 'Tài khoản', tabBarIcon: accountIcon }}
        />
      </Tab.Navigator>
    );
  }

  if (isAdmin) {
    return (
      <Tab.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: APP_COLORS.primary },
          headerTintColor: APP_COLORS.surface,
          tabBarActiveTintColor: APP_COLORS.primary,
          tabBarInactiveTintColor: APP_COLORS.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarStyle: {
            borderTopColor: APP_COLORS.border,
            backgroundColor: APP_COLORS.surface,
            minHeight: 62,
            paddingTop: 5,
            paddingBottom: 6,
          },
        }}
      >
        <Tab.Screen name="CallCenter" component={AdminBookingScreen} options={{ title: 'Đặt vé', tabBarIcon: ticketBookingIcon }} />
        <Tab.Screen name="CustomerOrders" component={CustomerTicketScreen} options={{ title: 'Vé nhận', tabBarIcon: ticketReceivedIcon }} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Lịch chạy', headerShown: false, tabBarIcon: scheduleIcon }} />
        <Tab.Screen name="CustomerNotifications" component={CustomerNotificationsScreen} options={{ title: 'Thông báo', tabBarIcon: customerNotificationsIcon }} />
        <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Menu', tabBarIcon: menuIcon }} />
      </Tab.Navigator>
    );
  }

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
        component={isDriver ? DriverTripsScreen : DashboardScreen}
        options={{
          title: isDriver ? 'Chuyến của tôi' : 'Trang chủ',
          tabBarIcon: dashboardIcon,
        }}
      />
      {isCallCenter ? (
        <Tab.Screen
          name="Passengers"
          component={PassengersScreen}
          options={{ title: 'Hành khách', tabBarIcon: passengersIcon }}
        />
      ) : null}
      <Tab.Screen
        name="Cargo"
        component={isDriver ? DriverCargoScreen : CargoScreen}
        options={{ title: 'Hàng hoá', tabBarIcon: cargoIcon }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: 'Bảo dưỡng', tabBarIcon: maintenanceIcon }}
      />
      {!isDriver ? (
        <Tab.Screen
          name="CallCenter"
          component={CallCenterScreen}
          options={{ title: 'Tổng Đài', tabBarIcon: callCenterIcon }}
        />
      ) : null}
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Tài khoản', tabBarIcon: accountIcon }}
      />
    </Tab.Navigator>
  );
}
