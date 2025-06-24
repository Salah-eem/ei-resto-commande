import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/hooks/useAuth";
import { User } from "@/src/types";
import { ApiService } from "@/src/services";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useThemedStyles } from "@/src/hooks/useThemedStyles";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import {
  setUserProfile,
  setLoading,
  setError,
} from "@/src/store/slices/userSlice";
import { fetchOrders } from "@/src/store/slices/orderSlice";

const { width } = Dimensions.get("window");

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
  gradient?: string[];
}

interface ActionButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
  color?: string;
  badge?: number;
  gradient?: string[];
}

interface NotificationCardProps {
  title: string;
  message: string;
  time: string;
  type: "order" | "delivery" | "system";
  onPress?: () => void;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(createThemedStyles);
  const dispatch = useDispatch<AppDispatch>();
  // Utilisation du store Redux pour le profil utilisateur et les commandes
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const userLoading = useSelector((state: RootState) => state.user.loading);
  const orders = useSelector((state: RootState) => state.orders.orders);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    totalDistance: 0,
    averageDeliveryTime: 0,
    completionRate: 0,
    // Enhanced metrics
    weeklyDeliveries: 0,
    avgOrderValue: 0,
    deliveryEfficiency: 0,
    fastestDelivery: 0,
    slowestDelivery: 0,
  });
  const [notifications, setNotifications] = useState<NotificationCardProps[]>(
    []
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    console.log(
      "HomeTab useEffect - isAuthenticated:",
      isAuthenticated,
      "token:",
      token ? "present" : "absent"
    );

    if (isAuthenticated && token) {
      console.log("Loading dashboard data...");
      loadDashboardData();
    } else {
      console.log("Not authenticated, stopping loading");
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  // Calculate stats when orders change
  useEffect(() => {
    calculateStats();
  }, [orders]);
  // Enhanced calculateStats method with backend integration
  const calculateStats = async () => {
    try {
      // First try to get stats from backend API
      let backendStats = null;
      try {
        backendStats = await ApiService.getQuickDashboardStats();
        console.log("Backend stats received:", backendStats);
      } catch (error) {
        console.warn(
          "Backend stats unavailable, falling back to local calculation:",
          error
        );
      }

      // If backend stats are available, use them; otherwise calculate locally
      if (backendStats) {
        await calculateStatsFromBackend(backendStats);
      } else {
        await calculateStatsLocally();
      }
    } catch (error) {
      console.error("Error in calculateStats:", error);
      await calculateStatsLocally(); // Always fallback to local calculation
    }
  };

  // Local calculation method (existing enhanced logic)
  const calculateStatsLocally = async () => {
    try {
      // Helper function to check if date is today
      const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
      };

      // Helper function to check if date is this week
      const isThisWeek = (date: Date) => {
        const today = new Date();
        const startOfWeek = new Date(
          today.setDate(today.getDate() - today.getDay())
        );
        const endOfWeek = new Date(
          today.setDate(today.getDate() - today.getDay() + 6)
        );
        return date >= startOfWeek && date <= endOfWeek;
      };

      // Helper function to calculate distance from position history
      const calculateDistance = (positionHistory: any[]) => {
        if (!positionHistory || positionHistory.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 1; i < positionHistory.length; i++) {
          const prev = positionHistory[i - 1];
          const curr = positionHistory[i];
          if (prev?.lat && prev?.lng && curr?.lat && curr?.lng) {
            // Haversine formula for distance calculation
            const R = 6371; // Earth's radius in kilometers
            const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
            const dLng = ((curr.lng - prev.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((prev.lat * Math.PI) / 180) *
                Math.cos((curr.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            totalDistance += R * c;
          }
        }
        return totalDistance;
      };

      // Load delivery history with error handling
      let deliveryHistory: any[] = [];
      try {
        // Load more history for better stats (last 100 orders)
        deliveryHistory = await ApiService.getDeliveryHistory(100);
      } catch (error) {
        console.warn("Error loading delivery history:", error);
        deliveryHistory = [];
      }

      // Combine current orders and history for comprehensive analysis
      const allOrders = [...orders, ...deliveryHistory];

      // Remove duplicates based on _id
      const uniqueOrders = allOrders.filter(
        (order, index, self) =>
          index === self.findIndex((o) => o._id === order._id)
      );

      // Current state analysis
      const pendingOrders = orders.filter(
        (order: any) =>
          order.orderStatus === "ready for delivery" ||
          order.orderStatus === "ready for delivery"
      ).length;

      const inProgressOrders = orders.filter(
        (order: any) =>
          order.orderStatus === "out for delivery" ||
          order.orderStatus === "out for delivery"
      ).length;

      // Today's performance analysis
      const todayOrders = uniqueOrders.filter((order: any) => {
        try {
          const orderDate = new Date(order.createdAt || order.updatedAt);
          return isToday(orderDate);
        } catch {
          return false;
        }
      });

      const deliveredOrdersToday = todayOrders.filter(
        (order: any) => order.orderStatus === "delivered"
      );

      const totalTodayEarnings = deliveredOrdersToday.reduce(
        (sum: number, order: any) => sum + (order.totalAmount || 0),
        0
      );

      // Week performance analysis
      const weekOrders = uniqueOrders.filter((order: any) => {
        try {
          const orderDate = new Date(order.createdAt || order.updatedAt);
          return isThisWeek(orderDate);
        } catch {
          return false;
        }
      });

      const deliveredOrdersWeek = weekOrders.filter(
        (order: any) => order.orderStatus === "delivered"
      );

      // Distance and time calculations
      let totalDistance = 0;
      let totalDeliveryTime = 0;
      let validDeliveryTimes: number[] = [];

      deliveredOrdersToday.forEach((order: any) => {
        // Calculate distance if position history exists
        if (order.positionHistory && Array.isArray(order.positionHistory)) {
          totalDistance += calculateDistance(order.positionHistory);
        }

        // Calculate delivery time
        try {
          const createdTime = new Date(order.createdAt).getTime();
          const deliveredTime = new Date(
            order.updatedAt || order.deliveredAt
          ).getTime();

          if (deliveredTime > createdTime) {
            const deliveryTimeMinutes =
              (deliveredTime - createdTime) / (1000 * 60);
            if (deliveryTimeMinutes > 0 && deliveryTimeMinutes < 300) {
              // Reasonable time (< 5 hours)
              validDeliveryTimes.push(deliveryTimeMinutes);
              totalDeliveryTime += deliveryTimeMinutes;
            }
          }
        } catch (error) {
          console.warn(
            "Error calculating delivery time for order:",
            order._id,
            error
          );
        }
      });

      // Average delivery time calculation
      const averageDeliveryTime =
        validDeliveryTimes.length > 0
          ? totalDeliveryTime / validDeliveryTimes.length
          : 0;

      // Completion rate calculation (delivered vs total assigned today)
      const assignedOrdersToday = todayOrders.filter(
        (order: any) => order.deliveryDriver || order.orderStatus !== "pending"
      );

      const completionRate =
        assignedOrdersToday.length > 0
          ? (deliveredOrdersToday.length / assignedOrdersToday.length) * 100
          : 0;

      // Performance metrics
      const avgOrderValue =
        deliveredOrdersToday.length > 0
          ? totalTodayEarnings / deliveredOrdersToday.length
          : 0;

      const deliveryEfficiency =
        validDeliveryTimes.length > 0
          ? (validDeliveryTimes.filter((time) => time <= 45).length /
              validDeliveryTimes.length) *
            100
          : 0;

      // Update stats with enhanced metrics
      const newStats = {
        todayDeliveries: deliveredOrdersToday.length,
        todayEarnings: Math.round(totalTodayEarnings * 100) / 100,
        pendingOrders,
        inProgressOrders,
        totalDistance: Math.round(totalDistance * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        completionRate: Math.round(completionRate * 100) / 100,
        // Additional metrics
        weeklyDeliveries: deliveredOrdersWeek.length,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        deliveryEfficiency: Math.round(deliveryEfficiency * 100) / 100,
        fastestDelivery:
          validDeliveryTimes.length > 0 ? Math.min(...validDeliveryTimes) : 0,
        slowestDelivery:
          validDeliveryTimes.length > 0 ? Math.max(...validDeliveryTimes) : 0,
      };

      setStats(newStats);
      generateNotifications(
        newStats,
        pendingOrders,
        inProgressOrders,
        totalTodayEarnings,
        averageDeliveryTime,
        deliveredOrdersToday.length
      );

      console.log("Local stats calculated:", newStats);
    } catch (error) {
      console.error("Error calculating local stats:", error);
      setFallbackStats();
    }
  };
  // Backend stats processing method
  const calculateStatsFromBackend = async (backendStats: any) => {
    try {
      // Map backend stats to our frontend format
      // backendStats structure from getQuickStats:
      // { todayOrders, activeDeliveries, totalRevenue, averageDeliveryTime,
      //   completionRate, pendingOrders, inProgressOrders, deliveredToday,
      //   avgOrderValue, onTimeDeliveryRate }
      const newStats = {
        todayDeliveries: backendStats.deliveredToday || 0,
        todayEarnings: backendStats.totalRevenue || 0,
        pendingOrders: backendStats.pendingOrders || 0,
        inProgressOrders: backendStats.inProgressOrders || 0,
        totalDistance: 0, // Not available in quick stats, would need comprehensive stats
        averageDeliveryTime: Math.round(backendStats.averageDeliveryTime || 0),
        completionRate: backendStats.completionRate || 0,
        // Enhanced metrics from backend
        weeklyDeliveries: 0, // Not available in quick stats
        avgOrderValue: backendStats.avgOrderValue || 0,
        deliveryEfficiency: backendStats.onTimeDeliveryRate || 0,
        fastestDelivery: 0, // Not available in quick stats
        slowestDelivery: 0, // Not available in quick stats
      };

      setStats(newStats);

      // Use backend data for notifications if available
      const pendingCount = newStats.pendingOrders;
      const inProgressCount = newStats.inProgressOrders;
      const earnings = newStats.todayEarnings;
      const avgTime = newStats.averageDeliveryTime;
      const deliveries = newStats.todayDeliveries;

      generateNotifications(
        newStats,
        pendingCount,
        inProgressCount,
        earnings,
        avgTime,
        deliveries
      );

      console.log("Backend stats processed:", newStats);
    } catch (error) {
      console.error("Error processing backend stats:", error);
      // Fallback to local calculation
      await calculateStatsLocally();
    }
  };

  // Notification generation method
  const generateNotifications = (
    stats: any,
    pendingCount: number,
    inProgressCount: number,
    earnings: number,
    avgTime: number,
    deliveries: number
  ) => {
    const newNotifications: NotificationCardProps[] = [];

    // Priority notifications
    if (inProgressCount > 0) {
      newNotifications.push({
        title: "Active Deliveries",
        message: `${inProgressCount} delivery(ies) in progress`,
        time: "Now",
        type: "delivery",
      });
    }

    if (pendingCount > 0) {
      newNotifications.push({
        title: "New Orders Available",
        message: `${pendingCount} order(s) ready for pickup`,
        time: "Now",
        type: "order",
      });
    }

    // Performance notifications
    if (deliveries > 0) {
      const performanceMessage =
        deliveries >= 10
          ? `Great job! ${deliveries} deliveries completed today`
          : `${deliveries} deliveries completed today`;

      newNotifications.push({
        title: "Today's Performance",
        message: performanceMessage,
        time: "Today",
        type: "system",
      });
    }

    // Efficiency notifications
    if (avgTime > 0 && avgTime <= 30) {
      newNotifications.push({
        title: "Excellent Speed!",
        message: `Average delivery time: ${Math.round(avgTime)} minutes`,
        time: "Today",
        type: "system",
      });
    }

    // Earnings milestone notifications
    if (earnings >= 100) {
      newNotifications.push({
        title: "Earnings Milestone",
        message: `$${earnings.toFixed(2)} earned today!`,
        time: "Today",
        type: "system",
      });
    }

    setNotifications(newNotifications);
  };

  // Fallback stats method
  const setFallbackStats = () => {
    setStats({
      todayDeliveries: 0,
      todayEarnings: 0,
      pendingOrders: orders.filter(
        (order: any) =>
          order.orderStatus === "ready for delivery" ||
          order.orderStatus === "ready for delivery"
      ).length,
      inProgressOrders: orders.filter(
        (order: any) =>
          order.orderStatus === "out for delivery" ||
          order.orderStatus === "out for delivery"
      ).length,
      totalDistance: 0,
      averageDeliveryTime: 0,
      completionRate: 0,
      weeklyDeliveries: 0,
      avgOrderValue: 0,
      deliveryEfficiency: 0,
      fastestDelivery: 0,
      slowestDelivery: 0,
    });

    // Error notification
    setNotifications([
      {
        title: "Stats Update Failed",
        message: "Unable to calculate latest statistics. Pull to refresh.",
        time: "Now",
        type: "system",
      },
    ]);
  };

  // Security timeout to avoid infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Data loading timeout - forcing loading stop");
        setLoading(false);
      }
    }, 8000); // 8 secondes maximum

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // First check if we are properly authenticated
      if (!isAuthenticated || !token) {
        setLoading(false);
        return;
      } // Load data with individual error handling
      let profileData = null;
      try {
        profileData = await ApiService.getDriverProfile();
        dispatch(setUserProfile(profileData));
      } catch (error) {
        console.warn("Error loading profile:", error);
        dispatch(setError("Failed to load profile"));
        // Continue even if profile fails
      } // Load orders via Redux
      try {
        dispatch(fetchOrders());
      } catch (error) {
        console.warn("Error loading orders:", error);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);

      // Ensure loading is set to false even on error
      setLoading(false);

      let errorMessage = "Unable to load dashboard data";
      if (error.message && error.message.includes("Network")) {
        errorMessage =
          "Network connection problem. Check your internet connection.";
      } else if (error.response?.status === 401) {
        errorMessage = "Session expired. Please log in again.";
        router.push("/login");
        return;
      }

      Alert.alert("Error", errorMessage); // Set default data in case of error
      setStats({
        todayDeliveries: 0,
        todayEarnings: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        totalDistance: 0,
        averageDeliveryTime: 0,
        completionRate: 0,
        weeklyDeliveries: 0,
        avgOrderValue: 0,
        deliveryEfficiency: 0,
        fastestDelivery: 0,
        slowestDelivery: 0,
      });

      setNotifications([
        {
          title: "Connection Error",
          message: "Unable to load data. Pull down to refresh.",
          time: "Now",
          type: "system",
        },
      ]);
    } finally {
      // Always ensure loading is set to false
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    gradient = ["#4CAF50", "#45A049"],
  }) => (
    <View style={styles.statCard}>
      <LinearGradient colors={gradient as any} style={styles.statGradient}>
        <View style={styles.statHeader}>
          <Ionicons name={icon as any} size={28} color="#fff" />
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </View>
  );

  const ActionButton: React.FC<ActionButtonProps> = ({
    title,
    icon,
    onPress,
    gradient = ["#007AFF", "#0056B3"],
    badge = 0,
  }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <LinearGradient colors={gradient as any} style={styles.actionGradient}>
        <View style={styles.actionIconContainer}>
          <Ionicons name={icon as any} size={28} color="#fff" />
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.actionText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const NotificationCard: React.FC<NotificationCardProps> = ({
    title,
    message,
    time,
    type,
    onPress,
  }) => (
    <TouchableOpacity style={styles.notificationCard} onPress={onPress}>
      <View style={styles.notificationHeader}>
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: getNotificationColor(type) },
          ]}
        >
          <Ionicons name={getNotificationIcon(type)} size={16} color="#fff" />
        </View>
        <Text style={styles.notificationTime}>{time}</Text>
      </View>
      <Text style={styles.notificationTitle}>{title}</Text>
      <Text style={styles.notificationMessage}>{message}</Text>
    </TouchableOpacity>
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order":
        return "restaurant-outline";
      case "delivery":
        return "bicycle-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "order":
        return "#FF9500";
      case "delivery":
        return "#007AFF";
      default:
        return "#666";
    }
  };

  // Redirect to login if not connected
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Ionicons name="log-in-outline" size={64} color="#666" />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginMessage}>
            Please log in to access the dashboard
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {" "}
        {/* Enhanced header */}
        {userProfile && (
          <LinearGradient colors={["#4CAF50", "#45A049"]} style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.driverInfo}>
                <Text style={styles.greetingText}>
                  {getGreeting()}, {userProfile.firstName} !
                </Text>
                <Text style={styles.timeText}>
                  {currentTime.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => router.push("/(tabs)/settings")}
                >
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, { backgroundColor: "#4CAF50" }]}
                >
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: "#8BC34A" },
                    ]}
                  />
                  <Text style={styles.statusText}>Online</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}
        {/* Enhanced quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              title="Orders"
              icon="list-outline"
              badge={stats.pendingOrders}
              onPress={() => router.push("/(tabs)/orders")}
              gradient={["#FF9500", "#FF8C00"]}
            />
            <ActionButton
              title="Navigation"
              icon="navigate-outline"
              badge={stats.inProgressOrders}
              onPress={() => router.push("/map-delivery")}
              gradient={["#007AFF", "#0056B3"]}
            />
            <ActionButton
              title="History"
              icon="time-outline"
              onPress={() => router.push("/(tabs)/history")}
              gradient={["#FF6B35", "#E55A2B"]}
            />
            <ActionButton
              title="Progress"
              icon="trophy-outline"
              // onPress={() => router.push("/(tabs)/gamification")}
              onPress={() => Alert.alert("Gamification", "Feature coming soon")}
              gradient={["#AF52DE", "#8E44AD"]}
            />
            <ActionButton
              title="Scanner QR"
              icon="qr-code-outline"
              onPress={() => Alert.alert("QR Scanner", "Feature coming soon")}
              gradient={["#17A2B8", "#138496"]}
            />

            <ActionButton
              title="Simulator"
              icon="car-outline"
              onPress={() => router.push("/delivery-simulator")}
              gradient={["#6A11CB", "#2575FC"]}
            />
          </View>
        </View>
        {/* Enhanced statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Deliveries"
              value={stats.todayDeliveries}
              subtitle="orders"
              icon="bicycle-outline"
              gradient={["#4CAF50", "#45A049"]}
            />
            <StatCard
              title="Earnings"
              value={`${stats.todayEarnings.toFixed(2)} €`}
              subtitle="today"
              icon="wallet-outline"
              gradient={["#FF9500", "#FF8C00"]}
            />
            <StatCard
              title="Distance"
              value={`${stats.totalDistance}km`}
              subtitle="traveled"
              icon="speedometer-outline"
              gradient={["#007AFF", "#0056B3"]}
            />
            <StatCard
              title="Average Time"
              value={`${stats.averageDeliveryTime}min`}
              subtitle="per delivery"
              icon="timer-outline"
              gradient={["#AF52DE", "#8E44AD"]}
            />
            <StatCard
              title="Success Rate"
              value={`${stats.completionRate}%`}
              subtitle="deliveries"
              icon="checkmark-circle-outline"
              gradient={["#34C759", "#28A745"]}
            />
          </View>
        </View>
        {/* Notifications */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Notifications</Text>
            {notifications.map((notification, index) => (
              <NotificationCard
                key={index}
                {...notification}
                onPress={() =>
                  Alert.alert(notification.title, notification.message)
                }
              />
            ))}
          </View>
        )}
        {/* Tip of the day */}
        <View style={styles.section}>
          <LinearGradient
            colors={["#17A2B8", "#138496"]}
            style={styles.tipCard}
          >
            <View style={styles.tipHeader}>
              <Ionicons name="bulb-outline" size={24} color="#fff" />
              <Text style={styles.tipTitle}>Tip of the Day</Text>
            </View>
            <Text style={styles.tipText}>
              Optimize your deliveries by grouping orders in the same area!
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createThemedStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      paddingTop: 20,
      paddingBottom: 30,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    driverInfo: {
      flex: 1,
    },
    greetingText: {
      fontSize: 26,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 4,
    },
    timeText: {
      fontSize: 16,
      color: "#E8F5E8",
      marginBottom: 8,
    },
    driverDetails: {
      marginTop: 8,
    },
    zoneText: {
      fontSize: 14,
      color: "#E8F5E8",
      marginBottom: 2,
    },
    vehicleText: {
      fontSize: 14,
      color: "#E8F5E8",
    },
    headerActions: {
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 12,
    },
    settingsButton: {
      padding: 10,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 12,
    },
    statusButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    statusIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "white",
    },
    statusText: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
    },
    section: {
      backgroundColor: theme.colors.card,
      margin: 16,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    actionButton: {
      flex: 1,
      minWidth: "45%",
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 5,
    },
    actionGradient: {
      alignItems: "center",
      padding: 20,
    },
    actionIconContainer: {
      position: "relative",
      marginBottom: 8,
    },
    badge: {
      position: "absolute",
      top: -8,
      right: -8,
      backgroundColor: "#FF3B30",
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#fff",
    },
    badgeText: {
      color: "white",
      fontSize: 12,
      fontWeight: "bold",
    },
    actionText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
      textAlign: "center",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: "45%",
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 5,
    },
    statGradient: {
      padding: 16,
    },
    statHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    statTitle: {
      fontSize: 14,
      color: "#fff",
      fontWeight: "500",
      opacity: 0.9,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 4,
    },
    statSubtitle: {
      fontSize: 12,
      color: "#fff",
      opacity: 0.8,
    },
    notificationCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#007AFF",
    },
    notificationHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    notificationIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    notificationTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    notificationMessage: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    tipCard: {
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 5,
    },
    tipHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 8,
    },
    tipTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#fff",
    },
    tipText: {
      fontSize: 14,
      color: "#fff",
      lineHeight: 20,
      opacity: 0.9,
    },
    loginPrompt: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    loginTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    loginMessage: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 22,
    },
    loginButton: {
      backgroundColor: "#4CAF50",
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    loginButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      marginTop: 10,
    },
  });
