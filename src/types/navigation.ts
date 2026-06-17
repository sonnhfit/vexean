import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Profile: undefined;
  EditProfile: undefined;
  AccountDetail: {
    section:
      | 'rewards'
      | 'offers'
      | 'referral'
      | 'cards'
      | 'reviews'
      | 'settings'
      | 'support'
      | 'feedback'
      | 'careers'
      | 'about';
  };
  VehicleDetail: { vehicleId: number };
  TicketBooking: {
    initialPhone?: string;
    initialPassengerName?: string;
  } | undefined;
  TicketSearchResults: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CustomerHome: undefined;
  CustomerTicket:
    | {
        initialPhone?: string;
        refreshKey?: number;
      }
    | undefined;
  CustomerOrders:
    | {
        initialPhone?: string;
        refreshKey?: number;
      }
    | undefined;
  CustomerFavorites: undefined;
  CustomerNotifications: undefined;
  Passengers: undefined;
  FleetManagement: undefined;
  Cargo: undefined;
  DriverManagement: undefined;
  Maintenance: undefined;
  Admin: undefined;
  CallCenter: undefined;
  Account: undefined;
};
