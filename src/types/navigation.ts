export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Profile: undefined;
  EditProfile: undefined;
  VehicleDetail: { vehicleId: number };
  TicketBooking: {
    initialPhone?: string;
    initialPassengerName?: string;
  } | undefined;
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
