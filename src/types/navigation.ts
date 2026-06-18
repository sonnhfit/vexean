import { NavigatorScreenParams } from '@react-navigation/native';

export type CustomerSearchLocation = {
  id: number;
  name: string;
  province?: string;
  type?: string;
  slug?: string;
  display_name?: string;
  active?: boolean;
  latitude?: number;
  longitude?: number;
  source?: 'odoo' | 'osm';
};

export type CustomerLocationPickerMode = 'origin' | 'destination';

export type CustomerLocationSelection = {
  mode: CustomerLocationPickerMode;
  location: CustomerSearchLocation;
};

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
  TicketSearchResults: {
    routeId: number;
    originName: string;
    destinationName: string;
    travelDate: string;
    returnDate?: string | null;
    serviceType?: string;
    passengers?: number;
    tripCount?: number;
    minPrice?: number | null;
    maxPrice?: number | null;
  };
  CustomerLocationSearch: {
    mode: CustomerLocationPickerMode;
    currentLocation?: CustomerSearchLocation | null;
  };
};

export type MainTabParamList = {
  Dashboard: undefined;
  CustomerHome:
    | {
        selectedLocation?: CustomerLocationSelection;
        selectionKey?: number;
      }
    | undefined;
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
