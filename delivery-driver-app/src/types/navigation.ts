export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Dashboard: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  DeliveryMap: { orderId: string };
  Settings: undefined;
  Profile: undefined;
  DeliveryProof?: { orderId: string };
  Chat?: { orderId: string };
  History?: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  OrdersTab: undefined;
  HistoryTab?: undefined;
  SettingsTab: undefined;
};
