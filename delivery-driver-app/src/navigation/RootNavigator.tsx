import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";

// Main Tab Screens
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import OrdersScreen from "../screens/orders/OrdersScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";

// Delivery Flow Screens
import OrderDetailScreen from "../screens/orders/OrderDetailScreen";
import { useAuth } from "../hooks/useAuth";

// Hooks

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  OrderDetail: { orderId: string };
  DeliveryTracking: { orderId: string };
  DeliveryProof: { orderId: string };
  Chat: { orderId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Orders: undefined;
  History: undefined;
  Settings: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Dashboard":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Orders":
              iconName = focused ? "list" : "list-outline";
              break;
            case "History":
              iconName = focused ? "time" : "time-outline";
              break;
            case "Settings":
              iconName = focused ? "settings" : "settings-outline";
              break;
            default:
              iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Accueil" }}
      />
      <MainTab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ tabBarLabel: "Commandes" }}
      />
      {/* 
      <MainTab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ tabBarLabel: 'Historique' }}
      />
      */}
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: "Paramètres" }}
      />
    </MainTab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <RootStack.Screen
          name="Auth"
          component={LoginScreen}
          options={{
            title: "Connexion",
            animationTypeForReplace: "pop",
          }}
        />
      ) : (
        <RootStack.Group>
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen
            name="OrderDetail"
            component={OrderDetailScreen}
            options={{
              title: "DÃ©tail commande",
              headerShown: true,
              presentation: "modal",
            }}
          />
          {/* Ã‰crans non migrÃ©s - Ã  recrÃ©er si nÃ©cessaire
          <RootStack.Screen 
            name="DeliveryTracking" 
            component={DeliveryTrackingScreen}
            options={{ 
              title: 'Livraison en cours',
              headerShown: true
            }}
          />
          <RootStack.Screen 
            name="DeliveryProof" 
            component={DeliveryProofScreen}
            options={{ 
              title: 'Preuve de livraison',
              headerShown: true,
              presentation: 'modal'
            }}
          />
          <RootStack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ 
              title: 'Chat client',
              headerShown: true,
              presentation: 'modal'
            }}
          />
          */}
        </RootStack.Group>
      )}
    </RootStack.Navigator>
  );
}
