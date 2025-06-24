import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Order } from "@/src/types";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/src/store";
import { fetchOrdersHistory } from "@/src/store/slices/orderSlice";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useThemedStyles } from "@/src/hooks/useThemedStyles";

// UI Display Interfaces
interface DeliveryItem {
  id: string;
  orderId: string;
  restaurant: string;
  customerAddress: string;
  customerName: string;
  status: "completed" | "canceled";
  date: string;
  deliveryTime: number;
  distance: string;
  items: number;
  totalAmount: number;
}

type FilterType = "all" | "completed" | "canceled";
type SortType = "date" | "earnings" | "rating";

export default function HistoryScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useTheme();
  const styles = useThemedStyles(createThemedStyles);

  // Redux state
  const { ordersHistory, loading, error, refreshing } = useSelector(
    (state: RootState) => state.orders
  );

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryItem | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [filter, setFilter] = useState<FilterType>("all"); // all, completed, canceled
  const [sortBy, setSortBy] = useState<SortType>("date"); // date, earnings, rating
  const router = useRouter();
  useEffect(() => {
    dispatch(fetchOrdersHistory());
  }, [dispatch]);

  useEffect(() => {
    processDeliveryHistory();
  }, [ordersHistory, filter, sortBy]);
  const applySort = (deliveriesArray: DeliveryItem[]): DeliveryItem[] => {
    return deliveriesArray.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        default:
          return 0;
      }
    });
  };

  const processDeliveryHistory = () => {
    if (ordersHistory && ordersHistory.length > 0) {
      // Transform API data into format expected by UI
      const transformedDeliveries = ordersHistory
        .filter(
          (order) =>
            order.orderStatus === "delivered" ||
            order.orderStatus === "canceled"
        )
        .map(transformOrderToHistoryItem);

      // Apply filters and sorting
      let filteredDeliveries = transformedDeliveries;

      if (filter !== "all") {
        filteredDeliveries = transformedDeliveries.filter(
          (delivery) => delivery.status === filter
        );
      }

      filteredDeliveries = applySort(filteredDeliveries);
      setDeliveries(filteredDeliveries);
    }
  };
  // Transform an API order into a history item
  const transformOrderToHistoryItem = (order: Order): DeliveryItem => {
    const isCompleted = order.orderStatus === "delivered";
    const isCanceled = order.orderStatus === "canceled";
    return {
      id: order._id,
      orderId: `#${order._id.slice(-5)}`,
      restaurant: "Restaurant",
      customerAddress: order.deliveryAddress
        ? `${order.deliveryAddress.street || ""} ${
            order.deliveryAddress.streetNumber || ""
          }, ${order.deliveryAddress.city || ""}`.trim()
        : "Address not specified",
      customerName: order.customer?.name || "Client",
      status: isCompleted ? "completed" : isCanceled ? "canceled" : "completed",
      date: order.createdAt || new Date().toISOString(),
      deliveryTime: calculateDeliveryTime(order),
      distance: calculateDistance(order.deliveryAddress),
      items: order.items?.length || 1,
      totalAmount: order.totalAmount || 0,
    };
  };

  const calculateDeliveryTime = (order: Order): number => {
    return Math.floor(Math.random() * 45) + 15; // 15-60 minutes
  };

  const calculateDistance = (address?: any): string => {
    if (address?.lat && address?.lng) {
      return (Math.random() * 10 + 1).toFixed(1);
    }
    return (Math.random() * 10 + 1).toFixed(1); // Fallback
  };
  const onRefresh = async () => {
    dispatch(fetchOrdersHistory());
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Canceled";
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDeliveryDetail = (delivery: DeliveryItem): void => {
    setSelectedDelivery(delivery);
    setShowDetailModal(true);
  };

  const renderDeliveryItem = ({ item }: { item: DeliveryItem }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => openDeliveryDetail(item)}
    >
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.orderId}>{item.orderId}</Text>
          <Text style={styles.restaurant}>{item.restaurant}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.deliveryDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.customerAddress}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {formatDate(item.date)} • {item.deliveryTime} min
          </Text>
        </View>

        <View style={styles.deliveryFooter}>
          <View style={styles.earnings}>
            <Ionicons name="cash-outline" size={16} color="#4CAF50" />
            <Text style={styles.earningsText}>
              {item.totalAmount.toFixed(2)}€
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
  const renderFilterButton = (filterType: FilterType, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.activeFilterButton,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.activeFilterButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const filteredDeliveries = deliveries;
  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {renderFilterButton("all", "Toutes")}
            {renderFilterButton("completed", "Completed")}
            {renderFilterButton("canceled", "Canceled")}
          </View>
        </ScrollView>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="funnel-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {deliveries.filter((d) => d.status === "completed").length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {deliveries
              .filter((d) => d.status === "completed")
              .reduce((sum, d) => sum + d.totalAmount, 0)
              .toFixed(2)}
            €
          </Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </View>
      {/* Delivery list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          renderItem={renderDeliveryItem}
          keyExtractor={(item) => item.id}
          style={styles.deliveryList}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No deliveries found</Text>{" "}
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delivery Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedDelivery && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>General Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.orderId}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.customerName}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.customerAddress}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: getStatusColor(selectedDelivery.status) },
                    ]}
                  >
                    {getStatusText(selectedDelivery.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Delivery Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedDelivery.date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Delivery Time:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.deliveryTime} minutes
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.distance} km
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Items:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.items} item(s)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount:</Text>
                  <Text style={styles.detailValue}>
                    {selectedDelivery.totalAmount.toFixed(2)}€
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal de tri */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.sortModalOverlay}>
          <View style={styles.sortModalContainer}>
            <Text style={styles.sortModalTitle}>Sort by</Text>
            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "date" && styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("date");
                setShowSortModal(false);
              }}
            >
              <Ionicons
                name={
                  sortBy === "date" ? "radio-button-on" : "radio-button-off"
                }
                size={20}
                color={sortBy === "date" ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "date" && styles.activeSortOptionText,
                ]}
              >
                Date
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "earnings" && styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("earnings");
                setShowSortModal(false);
              }}
            >
              <Ionicons
                name={
                  sortBy === "earnings" ? "radio-button-on" : "radio-button-off"
                }
                size={20}
                color={sortBy === "earnings" ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "earnings" && styles.activeSortOptionText,
                ]}
              >
                Earnings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === "rating" && styles.activeSortOption,
              ]}
              onPress={() => {
                setSortBy("rating");
                setShowSortModal(false);
              }}
            >
              <Ionicons
                name={
                  sortBy === "rating" ? "radio-button-on" : "radio-button-off"
                }
                size={20}
                color={sortBy === "rating" ? "#007AFF" : "#666"}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === "rating" && styles.activeSortOptionText,
                ]}
              >
                Note
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortCancelButton}
              onPress={() => setShowSortModal(false)}
            >
              <Text style={styles.sortCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createThemedStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      textAlign: "center",
      marginHorizontal: 16,
    },
    headerSpacer: {
      width: 40,
    },
    filtersContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      marginRight: 8,
    },
    activeFilterButton: {
      backgroundColor: "#007AFF",
    },
    filterButtonText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    activeFilterButtonText: {
      color: "#fff",
    },
    sortButton: {
      marginLeft: "auto",
      padding: 8,
    },
    statsContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.card,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: "center",
    },
    statNumber: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    deliveryList: {
      flex: 1,
    },
    listContent: {
      padding: 16,
    },
    deliveryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    deliveryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    deliveryInfo: {
      flex: 1,
    },
    orderId: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    restaurant: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 12,
      color: "#fff",
      fontWeight: "600",
    },
    deliveryDetails: {
      marginBottom: 8,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    detailText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 8,
      flex: 1,
    },
    deliveryFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    earnings: {
      flexDirection: "row",
      alignItems: "center",
    },
    earningsText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#4CAF50",
      marginLeft: 4,
    },
    rating: {
      flexDirection: "row",
      alignItems: "center",
    },
    ratingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
      marginBottom: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    retryButton: {
      backgroundColor: "#007AFF",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    detailSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 12,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      width: 120,
    },
    detailValue: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
      fontWeight: "500",
    },
    sortModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    sortModalContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 20,
      margin: 20,
      width: "80%",
      maxWidth: 300,
    },
    sortModalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    sortModalSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    sortOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginBottom: 8,
    },
    activeSortOption: {
      backgroundColor: theme.dark ? "rgba(0, 122, 255, 0.2)" : "#f0f8ff",
    },
    sortOptionText: {
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 12,
    },
    activeSortOptionText: {
      color: "#007AFF",
      fontWeight: "600",
    },
    sortCancelButton: {
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      alignItems: "center",
    },
    sortCancelButtonText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },
  });
