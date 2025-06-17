import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Order } from "../../types";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onStatusUpdate: (status: string) => void;
}

const { width } = Dimensions.get("window");

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onStatusUpdate,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready for delivery":
        return "#FF9800";
      case "out for delivery":
        return "#2196F3";
      case "delivered":
        return "#4CAF50";
      case "canceled":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready for delivery":
        return "Prête pour livraison";
      case "out for delivery":
        return "En cours de livraison";
      case "delivered":
        return "Livrée";
      case "canceled":
        return "Annulée";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready for delivery":
        return "time-outline";
      case "out for delivery":
        return "car-outline";
      case "delivered":
        return "checkmark-circle-outline";
      case "canceled":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} €`;
  };

  const canUpdateStatus = () => {
    return (
      order.orderStatus === "ready for delivery" ||
      order.orderStatus === "out for delivery"
    );
  };

  const getNextStatus = () => {
    if (order.orderStatus === "ready for delivery") {
      return "out for delivery";
    }
    if (order.orderStatus === "out for delivery") {
      return "delivered";
    }
    return null;
  };

  const getNextStatusText = () => {
    const nextStatus = getNextStatus();
    if (nextStatus === "out for delivery") {
      return "Prendre en charge";
    }
    if (nextStatus === "delivered") {
      return "Marquer comme livrée";
    }
    return null;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>
            #{order.orderNumber || order._id.slice(-6)}
          </Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.orderStatus) },
          ]}
        >
          <Ionicons
            name={getStatusIcon(order.orderStatus) as any}
            size={14}
            color="white"
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>
            {getStatusText(order.orderStatus)}
          </Text>
        </View>
      </View>
      <View style={styles.customerInfo}>
        <Ionicons name="person-outline" size={16} color="#666" />
        <Text style={styles.customerName}>{order.customer?.name}</Text>
      </View>

      <View style={styles.addressInfo}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.address} numberOfLines={2}>
          {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.itemsInfo}>
          <Ionicons name="bag-outline" size={16} color="#666" />
          <Text style={styles.itemsCount}>
            {order.items?.length || 0} article(s)
          </Text>
        </View>{" "}
        <Text style={styles.totalPrice}>{formatPrice(order.totalAmount)}</Text>
      </View>

      {canUpdateStatus() && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            const nextStatus = getNextStatus();
            if (nextStatus) {
              onStatusUpdate(nextStatus);
            }
          }}
        >
          <Text style={styles.actionButtonText}>{getNextStatusText()}</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  customerName: {
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  addressInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  address: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    flex: 1,
    lineHeight: 20,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemsCount: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  actionButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginRight: 8,
  },
});
