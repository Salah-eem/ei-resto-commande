import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/hooks/useAuth";
import { Order } from "@/src/types";
import { useWebSocket } from "@/src/hooks/useWebSocket";
import apiService from "@/src/services/ApiService";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import {
  fetchOrders,
  refreshOrders,
  updateOrderInList,
  clearError,
} from "@/src/store/slices/orderSlice";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useThemedStyles } from "@/src/hooks/useThemedStyles";

const { width } = Dimensions.get("window");

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

interface FilterOptions {
  orderStatus: string;
  sortBy: string;
  orderType: string;
  priority: string;
  maxDistance: number;
}

export default function OrdersScreen() {
  const { isAuthenticated } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createThemedStyles);

  // Redux state
  const { orders, loading, error, refreshing } = useSelector(
    (state: RootState) => state.orders
  );
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    orderStatus: "all",
    sortBy: "time",
    orderType: "all",
    priority: "all",
    maxDistance: 10,
  });
  const router = useRouter();

  // WebSocket connection
  const {
    socket,
    isConnected: socketConnected,
    joinDeliveryRoom,
  } = useWebSocket({
    autoConnect: isAuthenticated,
    onConnect: () => {
      console.log("Orders WebSocket connected");
      if (isAuthenticated) {
        joinDeliveryRoom();
      }
    },
    onDisconnect: () => {
      console.log("Orders WebSocket disconnected");
    },
  });
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchOrders());
    }
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (socket && socketConnected) {
      // Listen for delivery orders updates
      socket.on("deliveryOrders:update", handleOrdersUpdate);

      return () => {
        socket.off("deliveryOrders:update", handleOrdersUpdate);
      };
    }
  }, [socket, socketConnected]);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const handleOrdersUpdate = (newOrders: Order[]) => {
    // Update orders via WebSocket
    newOrders.forEach((order) => {
      dispatch(updateOrderInList(order));
    });
  };

  const onRefresh = async () => {
    dispatch(refreshOrders());
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.orderStatus !== "all") {
      filtered = filtered.filter(
        (order) => order.orderStatus === filters.orderStatus
      );
    }

    if (filters.orderType !== "all") {
      filtered = filtered.filter((order) => "delivery" === filters.orderType);
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "amount":
          return b.totalAmount - a.totalAmount;
        case "number":
          return a.orderNumber.localeCompare(b.orderNumber);
        default: // time
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    setFilteredOrders(filtered);
  };

  const getStatusColor = (orderStatus: string) => {
    switch (orderStatus) {
      case "ready for delivery":
        return "#FF9500";
      case "out for delivery":
        return "#007AFF";
      case "delivered":
        return "#34C759";
      case "canceled":
        return "#FF3B30";
      default:
        return "#666";
    }
  };

  const getStatusGradient = (orderStatus: string) => {
    switch (orderStatus) {
      case "ready for delivery":
        return ["#FF9500", "#E6850E"];
      case "out for delivery":
        return ["#007AFF", "#0051D0"];
      case "delivered":
        return ["#34C759", "#28A745"];
      case "canceled":
        return ["#FF3B30", "#CC0000"];
      default:
        return ["#666", "#555"];
    }
  };

  const getStatusText = (orderStatus: string) => {
    switch (orderStatus) {
      case "ready for delivery":
        return "Ready for Delivery";
      case "out for delivery":
        return "Out for Delivery";
      case "delivered":
        return "Delivered";
      case "canceled":
        return "Canceled";
      default:
        return "Unknown Status";
    }
  };

  const getStatusIcon = (orderStatus: string) => {
    switch (orderStatus) {
      case "ready for delivery":
        return "time-outline";
      case "out for delivery":
        return "bicycle-outline";
      case "delivered":
        return "checkmark-circle-outline";
      case "canceled":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  const getTypeIcon = (orderType: string) => {
    switch (orderType) {
      case "delivery":
        return "bicycle-outline";
      case "pickup":
        return "walk-outline";
      default:
        return "help-circle-outline";
    }
  };

  const handleOrderPress = async (order: Order) => {
    // Get current user ID from context or authentication service
    const currentUser = await apiService.getCurrentUser();
    router.push(`/orders/${order._id}`);

    // if (order.orderStatus === 'ready for delivery') {
    //   router.push(`/orders/${order._id}`);
    // } else if (order.orderStatus === 'out for delivery' && order.deliveryDriver?._id === currentUser._id) {
    //   router.push(`/delivery-map/${order._id}` as any);
    // }
  };
  const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    currentFilters,
  }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Orders</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Order Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: "all", label: "All Orders", icon: "list-outline" },
                  {
                    key: "ready for delivery",
                    label: "Ready for Delivery",
                    icon: "checkmark-circle-outline",
                  },
                  {
                    key: "out for delivery",
                    label: "Out for Delivery",
                    icon: "car-outline",
                  },
                  {
                    key: "delivered",
                    label: "Delivered",
                    icon: "checkmark-done-outline",
                  },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      currentFilters.orderStatus === option.key &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        orderStatus: option.key,
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={
                        currentFilters.orderStatus === option.key
                          ? "#fff"
                          : theme.colors.primary
                      }
                    />
                    <Text
                      style={[
                        styles.filterOptionText,
                        currentFilters.orderStatus === option.key &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Distance Range</Text>
              <View style={styles.distanceContainer}>
                <Text style={styles.distanceLabel}>
                  Within {filters.maxDistance || 10} km
                </Text>
                <View style={styles.distanceSliderContainer}>
                  <Text style={styles.distanceValue}>1km</Text>
                  <View style={styles.distanceSlider}>
                    <View
                      style={[
                        styles.distanceSliderTrack,
                        {
                          width: `${((filters.maxDistance || 10) / 20) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.distanceValue}>20km</Text>
                </View>
                <View style={styles.distanceButtons}>
                  {[5, 10, 15, 20].map((distance) => (
                    <TouchableOpacity
                      key={distance}
                      style={[
                        styles.distanceButton,
                        (filters.maxDistance || 10) === distance &&
                          styles.distanceButtonSelected,
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          maxDistance: distance,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.distanceButtonText,
                          (filters.maxDistance || 10) === distance &&
                            styles.distanceButtonTextSelected,
                        ]}
                      >
                        {distance}km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => {
                setFilters({
                  orderStatus: "all",
                  orderType: "all",
                  priority: "all",
                  maxDistance: 10,
                  sortBy: "time",
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.modalButtonSecondaryText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                onApply(filters);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="funnel-outline" size={16} color="#fff" />
              <Text
                style={[styles.modalButtonText, styles.modalButtonTextPrimary]}
              >
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
    >
      <LinearGradient
        colors={getStatusGradient(item.orderStatus) as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.statusIndicator}
      />

      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.customerName}>
            {item.customer?.name || "Unknown Customer"}
          </Text>
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.orderStatus) },
              ]}
            >
              {getStatusText(item.orderStatus)}
            </Text>
          </View>{" "}
        </View>
        <View style={styles.orderMeta}>
          <Text style={styles.amountText}>{item.totalAmount.toFixed(2)} €</Text>
          <View style={styles.typeContainer}>
            <Ionicons
              name={getTypeIcon("delivery") as any}
              size={16}
              color="#666"
            />
            <Text style={styles.typeText}>Delivery</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDetails}>
        {item.deliveryAddress && (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.addressText}>
              {item.deliveryAddress.street} {item.deliveryAddress.streetNumber},{" "}
              {item.deliveryAddress.city}
            </Text>
          </View>
        )}

        <View style={styles.orderStats}>
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={14} color="#666" />
            <Text style={styles.statText}>#{item._id.slice(-5)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="restaurant-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.items.length} article(s)</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.statText}>
              {new Date(item.createdAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </View>
      {item.orderStatus === "ready for delivery" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => router.push(`/delivery-map/${item._id}` as any)}
          >
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              style={styles.mapButtonGradient}
            >
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.mapButtonText}>Carte</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
  // Redirect to login if not connected
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Ionicons name="log-in-outline" size={64} color="#666" />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginMessage}>Please sign in to view orders</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backToDashboard}
          onPress={() => router.push("/(tabs)" as any)}
        >
          <Ionicons name="home-outline" size={20} color="#007AFF" />
          <Text style={styles.backToDashboardText}>Home</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Orders to Deliver</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredOrders.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {
              filteredOrders.filter(
                (o) => o.orderStatus === "ready for delivery"
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Ready</Text>
        </View>{" "}
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {
              filteredOrders.filter((o) => o.orderStatus === "out for delivery")
                .length
            }
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No orders available</Text>
            <Text style={styles.emptySubtext}>New orders will appear here</Text>
          </View>
        }
      />
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={applyFilters}
        currentFilters={filters}
      />
    </SafeAreaView>
  );
}

const createThemedStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundColor,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    backToDashboard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      gap: 4,
    },
    backToDashboardText: {
      fontSize: 14,
      color: "#007AFF",
      fontWeight: "500",
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      flex: 1,
      textAlign: "center",
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    filterButton: {
      padding: 8,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
    },
    refreshButton: {
      padding: 8,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
    },
    statsBar: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: theme.colors.card,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#007AFF",
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    listContainer: {
      padding: 16,
    },
    orderCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
      overflow: "hidden",
    },
    statusIndicator: {
      height: 4,
      width: "100%",
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: 16,
      paddingBottom: 12,
    },
    orderInfo: {
      flex: 1,
    },
    customerName: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statusText: {
      fontSize: 14,
      fontWeight: "500",
    },
    orderMeta: {
      alignItems: "flex-end",
    },
    amountText: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#4CAF50",
      marginBottom: 4,
    },
    typeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    typeText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    orderDetails: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    addressContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
      gap: 8,
    },
    addressText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    orderStats: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    acceptButton: {
      flex: 1,
      margin: 16,
      marginTop: 0,
      borderRadius: 8,
      overflow: "hidden",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    filterSection: {
      marginBottom: 24,
    },
    filterLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    filterOptions: {
      gap: 8,
    },
    filterOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    filterOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterOptionText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    filterOptionTextSelected: {
      color: "#fff",
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    modalButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      gap: 6,
    },
    modalButtonPrimary: {
      backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    modalButtonTextPrimary: {
      color: "#fff",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalScrollView: {
      maxHeight: "70%",
    },
    modalButtonSecondary: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
      marginRight: 12,
      gap: 6,
    },
    modalButtonSecondaryText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    distanceContainer: {
      marginTop: 8,
    },
    distanceLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    distanceSliderContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    distanceValue: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    distanceSlider: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      marginHorizontal: 12,
      overflow: "hidden",
    },
    distanceSliderTrack: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    distanceButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    distanceButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    distanceButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    distanceButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.text,
    },
    distanceButtonTextSelected: {
      color: "#fff",
    },
    // Styles for login page
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
    // Styles for loading
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
    // Styles pour les boutons d'action
    actionButtons: {
      flexDirection: "row",
      gap: 8,
      width: "100%",
    },
    mapButton: {
      flex: 1,
      borderRadius: 8,
      overflow: "hidden",
    },
    mapButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 6,
    },
    mapButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
  });
