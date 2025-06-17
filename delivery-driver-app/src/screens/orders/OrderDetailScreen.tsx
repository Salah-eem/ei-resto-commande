import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Hooks
import { useOrders } from "../../hooks/useOrders";
import { useAuth } from "../../hooks/useAuth";
import { useDelivery } from "../../hooks/useDelivery";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// Components
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ErrorMessage } from "../../components/ui/ErrorMessage";

// Types
import { Order, OrderItem } from "../../types";

const { width } = Dimensions.get("window");

const OrderDetailScreen: React.FC = () => {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = useThemedStyles(createThemedStyles);

  const { user } = useAuth();
  const { orders, loading, error, getOrderById, updateStatus } = useOrders();
  const currentOrder = orders.find((order) => order._id === orderId);
  const { start: startDelivery } = useDelivery();

  const [startingDelivery, setStartingDelivery] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);
  const loadOrder = async () => {
    try {
      const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;
      if (orderIdStr) {
        await getOrderById(orderIdStr);
      }
    } catch (error: any) {
      Alert.alert("Error", "Unable to load order details");
    }
  };

  const handleStartDelivery = async () => {
    if (!currentOrder) return;

    try {
      setStartingDelivery(true);
      await updateStatus(currentOrder._id, "out for delivery");
      await startDelivery(currentOrder._id);
      //   Alert.alert(
      //   'Delivery Started',
      //   'You can now navigate to the delivery address',
      //   [
      //     {
      //       text: 'OK',
      //       onPress: () => router.back()
      //     }
      //   ]
      // );
    } catch (error: any) {
      Alert.alert("Error", "Unable to start delivery");
    } finally {
      setStartingDelivery(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!currentOrder) return;
    Alert.alert(
      "Confirm Delivery",
      "Are you sure you want to mark this order as delivered?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateStatus(currentOrder._id, "delivered");
              Alert.alert("Success", "Order marked as delivered", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              Alert.alert("Error", "Unable to update status");
            }
          },
        },
      ]
    );
  };

  const handleCallCustomer = () => {
    if (currentOrder?.customer?.phone) {
      Linking.openURL(`tel:${currentOrder.customer.phone}`);
    }
  };

  const handleNavigateToAddress = () => {
    if (currentOrder?.deliveryAddress) {
      const address = currentOrder.deliveryAddress;
      const url = Platform.select({
        ios: `maps:0,0?q=${address.street}, ${address.city}`,
        android: `geo:0,0?q=${address.street}, ${address.city}`,
      });

      if (url) {
        Linking.openURL(url);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready for delivery":
        return "#FF9800";
      case "out for delivery":
        return "#2196F3";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready for delivery":
        return "Ready for Delivery";
      case "out for delivery":
        return "Out for Delivery";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} €`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrderItem = (item: OrderItem, index: number) => (
    <View key={index} style={styles.orderItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
      </View>
      <View style={styles.itemQuantity}>
        <Text style={styles.quantityText}>x{item.quantity}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadOrder} />;
  }
  if (!currentOrder) {
    return (
      <SafeAreaView style={styles.container}>
        {" "}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canStartDelivery = currentOrder.orderStatus === "ready for delivery";
  const canCompleteDelivery = currentOrder.orderStatus === "out for delivery";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.header}>
        <View style={styles.headerContent}>
          {" "}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>{" "}
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Order #{currentOrder._id.slice(-5)}
            </Text>
            <Text style={styles.headerDate}>
              {formatDate(currentOrder.createdAt)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(currentOrder.orderStatus) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(currentOrder.orderStatus)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>{" "}
          <View style={styles.customerInfo}>
            {" "}
            <Text style={styles.customerName}>
              {currentOrder.customer?.name || "Customer"}
            </Text>
            {currentOrder.customer?.phone && (
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={16} color="#4CAF50" />
                <Text style={styles.phoneText}>
                  {currentOrder.customer?.phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>{" "}
          <TouchableOpacity
            style={styles.addressContainer}
            onPress={handleNavigateToAddress}
          >
            <Text style={styles.addressText}>
              {currentOrder.deliveryAddress?.street},{" "}
              {currentOrder.deliveryAddress?.city}
            </Text>
            <Ionicons name="navigate" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bag" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Ordered Items</Text>
          </View>{" "}
          <View style={styles.itemsList}>
            {currentOrder.items.map((item: OrderItem, index: number) =>
              renderOrderItem(item, index)
            )}
          </View>
        </View>

        {/* Order Total */}
        <View style={styles.section}>
          {" "}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatPrice(currentOrder.totalAmount)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {canStartDelivery && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartDelivery}
            disabled={startingDelivery}
          >
            {startingDelivery ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              <>
                <Ionicons name="car" size={20} color="white" />
                <Text style={styles.actionButtonText}>Start Delivery</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {canCompleteDelivery && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={handleCompleteDelivery}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.actionButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}{" "}
        <TouchableOpacity
          style={[styles.actionButton, styles.mapButton]}
          onPress={() =>
            /*router.push("/delivery-simulator")*/ handleNavigateToAddress()
          }
        >
          <Ionicons name="map" size={20} color="white" />
          <Text style={styles.actionButtonText}>View on Map</Text>
        </TouchableOpacity>
        {/* New button for real order simulator */}
        <TouchableOpacity
          style={[styles.actionButton, styles.simulatorButton]}
          onPress={() =>
            router.push({
              pathname: "/real-order-simulator",
              params: {
                orderId: currentOrder._id,
              },
            })
          }
        >
          <Ionicons name="car-sport" size={20} color="white" />
          <Text style={styles.actionButtonText}>Delivery Simulator</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createThemedStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: Platform.OS === "ios" ? 0 : StatusBar.currentHeight,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      paddingTop: 8,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "white",
    },
    headerDate: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      fontSize: 12,
      color: "white",
      fontWeight: "500",
    },
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginLeft: 8,
    },
    customerInfo: {
      marginLeft: 28,
    },
    customerName: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 8,
    },
    phoneButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    phoneText: {
      fontSize: 14,
      color: "#4CAF50",
      marginLeft: 6,
    },
    addressContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginLeft: 28,
      paddingVertical: 8,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
      marginRight: 12,
    },
    itemsList: {
      marginLeft: 28,
    },
    orderItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    itemPrice: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    itemQuantity: {
      backgroundColor: "#f0f0f0",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    quantityText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    totalContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 16,
      borderTopWidth: 2,
      borderTopColor: "#4CAF50",
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    totalAmount: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#4CAF50",
    },
    actionContainer: {
      padding: 16,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: "#e0e0e0",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    startButton: {
      backgroundColor: "#4CAF50",
    },
    completeButton: {
      backgroundColor: "#2196F3",
    },
    mapButton: {
      backgroundColor: "#FF9800",
    },
    simulatorButton: {
      backgroundColor: "#9C27B0",
    },
    actionButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "500",
      marginLeft: 8,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    errorText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    backButtonText: {
      color: "#4CAF50",
      fontSize: 16,
      fontWeight: "500",
    },
  });

export default OrderDetailScreen;
