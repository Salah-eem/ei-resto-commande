import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Types
import { RootStackParamList, MainTabParamList } from './src/types/navigation';

// Store Provider
import { StoreProvider } from './src/store/StoreProvider';

// Hooks
import { useAppSelector, useAppDispatch } from './src/store';
import { setInitialized } from './src/store/slices/appSlice';

// Screens - New Architecture
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import OrdersScreen from './src/screens/orders/OrdersScreen';
import OrderDetailScreen from './src/screens/orders/OrderDetailScreen';
import DeliveryMapScreen from './src/screens/delivery/DeliveryMapScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import { useAuth } from './src/hooks/useAuth';

// NOTE: Les anciens écrans legacy ont été supprimés
// DeliveryProofScreen, ChatScreen, GamificationScreen seront recréés si nécessaire

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// App Initializer Component
function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector(state => state.app);
  const { loading: authLoading } = useAppSelector(state => state.auth);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting Delivery Driver App with new architecture...');
      
      // Mark app as initialized
      dispatch(setInitialized(true));
      
      console.log('✅ App initialization completed');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      // Still mark as initialized to allow app to work
      dispatch(setInitialized(true));
    }
  };

  if (!isInitialized || authLoading) {
    return (
      <View style={styles.initializationContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.initializationTitle}>
          Delivery Driver App
        </Text>
        <Text style={styles.initializationText}>
          Initializing services...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'DashboardTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'OrdersTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'HistoryTab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Accueil' }}      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersScreen}
        options={{ tabBarLabel: 'Commandes' }}
      />      
      {/* 
      <Tab.Screen 
        name="HistoryTab" 
        component={GamificationScreen}
        options={{ tabBarLabel: 'Historique' }}
      />
      */}
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'Paramètres' }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator with Authentication
function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ 
            title: 'Connexion',
            animationTypeForReplace: 'pop'
          }}
        />
      ) : (
        <Stack.Group>
          <Stack.Screen 
            name="Main" 
            component={MainTabs}
          />
          <Stack.Screen 
            name="OrderDetail" 
            component={OrderDetailScreen}
            options={{ 
              title: 'Détail commande',
              headerShown: true,
              presentation: 'modal'
            }}
          />
          <Stack.Screen 
            name="DeliveryMap" 
            component={DeliveryMapScreen}
            options={{ 
              title: 'Livraison en cours',              headerShown: true
            }}
          />
          {/* 
          <Stack.Screen 
            name="DeliveryProof" 
            component={DeliveryProofScreen}
            options={{ 
              title: 'Preuve de livraison',
              headerShown: true,
              presentation: 'modal'
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ 
              title: 'Chat client',
              headerShown: true,
              presentation: 'modal'
            }}
          />
          */}
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

// Main App Component
function AppContent() {
  return (
    <AppInitializer>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppInitializer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  initializationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 32,
  },
  initializationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  initializationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
});
