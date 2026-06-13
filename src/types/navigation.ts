export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Profile: undefined;
  VehicleDetail: { vehicleId: number };
  TicketBooking: {
    initialPhone?: string;
    initialPassengerName?: string;
  } | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Passengers: undefined;
  FleetManagement: undefined;
  Cargo: undefined;
  DriverManagement: undefined;
  Maintenance: undefined;
  Admin: undefined;
  CallCenter: undefined;
  Account: undefined;
};
