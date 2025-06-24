// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
//   Platform,
//   StatusBar,
//   ActivityIndicator,
//   Modal,
//   ScrollView,
//   Dimensions,
// } from 'react-native';
// import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
// import * as Location from 'expo-location';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import io from 'socket.io-client';
// import DeliveryStatusIndicator from '../components/DeliveryStatusIndicator';
// import DataService from '../services/DataService';
// import { Order } from '../../types';

// const { width, height } = Dimensions.get('window');

// interface LocationCoordinate {
//   latitude: number;
//   longitude: number;
// }

// interface RouteCoordinate {
//   lat: number;
//   lng: number;
// }

// // Custom Modal Component
// const CustomModal = ({
//   visible,
//   onClose,
//   title,
//   children,
//   type = 'info'
// }: {
//   visible: boolean;
//   onClose: () => void;
//   title: string;
//   children: React.ReactNode;
//   type?: 'info' | 'success' | 'error';
// }) => {  const getGradientColors = (): [string, string] => {
//     switch (type) {
//       case 'success':
//         return ['#4CAF50', '#45a049'];
//       case 'error':
//         return ['#f44336', '#d32f2f'];
//       default:
//         return ['#2196F3', '#1976D2'];
//     }
//   };

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       onRequestClose={onClose}
//     >
//       <View style={styles.modalOverlay}>
//         <View style={styles.modalContainer}>
//           <LinearGradient
//             colors={getGradientColors()}
//             style={styles.modalHeader}
//           >
//             <Text style={styles.modalTitle}>{title}</Text>
//             <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//               <Ionicons name="close" size={24} color="#fff" />
//             </TouchableOpacity>
//           </LinearGradient>
//           <View style={styles.modalContent}>
//             {children}
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// };

// export default function MapDeliveryPage() {
//   const [location, setLocation] = useState<LocationCoordinate | null>(null);
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [restaurantLocation, setRestaurantLocation] = useState<LocationCoordinate>();
//   const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
//   const [route, setRoute] = useState<LocationCoordinate[]>([]);
//   const [isTracking, setIsTracking] = useState(false);
//   const [eta, setEta] = useState<string>('');
//   const [distance, setDistance] = useState<string>('');
//   const [orderModalVisible, setOrderModalVisible] = useState(false);  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [locationPermissionModal, setLocationPermissionModal] = useState(false);
//   const [deliveryStatus, setDeliveryStatus] = useState<'idle' | 'navigating' | 'arrived' | 'delivering'>('idle');

//   const mapRef = useRef<MapView>(null);
//   const socketRef = useRef<any>(null);
//   const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
//   const dataService = DataService.getInstance();

//   // Initialize location and permissions
//   useEffect(() => {
//     initializeRestaurantLocation();
//     initializeLocation();
//     fetchOrders();
//     initializeSocket();

//     return () => {
//       if (locationWatchRef.current) {
//         locationWatchRef.current.remove();
//       }
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//     };
//   }, []);

//       const initializeRestaurantLocation = async () => {
//       // Fetch restaurant location from API or hardcoded for now
//       const restaurant = await dataService.getRestaurantInfo();
//       if (restaurant && restaurant.address) {
//         setRestaurantLocation({
//           latitude: restaurant.address.lat,
//           longitude: restaurant.address.lng,
//         });
//       }
//     };

//   const initializeLocation = async () => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         setLocationPermissionModal(true);
//         setLoading(false);
//         return;
//       }

//       const currentLocation = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.High,
//       });

//       setLocation({
//         latitude: currentLocation.coords.latitude,
//         longitude: currentLocation.coords.longitude,
//       });

//       setLoading(false);
//     } catch (error) {
//       console.error('Error getting location:', error);
//       setLoading(false);
//     }
//   };

//   const initializeSocket = () => {
//     socketRef.current = io('http://localhost:3001/delivery', {
//       transports: ['websocket'],
//     });

//     socketRef.current.on('connect', () => {
//       console.log('Connected to delivery socket');
//     });

//     socketRef.current.on('newOrder', (order: Order) => {
//       setOrders(prev => [...prev, order]);
//     });
//   };

//   const fetchOrders = async () => {
//     // fetching orders from API
//     try {
//       const response = await dataService.getAvailableDeliveries();
//       setOrders(response.filter((order: Order) => order.orderStatus === 'ready_for_delivery'));
//     } catch (error) {
//       console.error('Error fetching orders:', error);
//     }
//   };

//   const calculateRoute = async (start: LocationCoordinate, end: LocationCoordinate) => {
//     try {
//       // Simple route calculation (in production, use Google Directions API)
//       const routePoints = [
//         start,
//         {
//           latitude: start.latitude + (end.latitude - start.latitude) * 0.5,
//           longitude: start.longitude + (end.longitude - start.longitude) * 0.5,
//         },
//         end
//       ];

//       setRoute(routePoints);

//       // Calculate distance and ETA
//       const dist = calculateDistance(start, end);
//       setDistance(`${dist.toFixed(1)} km`);
//       setEta(`${Math.ceil(dist * 3)} min`); // Assume 20 km/h average speed

//     } catch (error) {
//       console.error('Error calculating route:', error);
//     }
//   };

//   const calculateDistance = (start: LocationCoordinate, end: LocationCoordinate): number => {
//     const R = 6371; // Earth's radius in km
//     const dLat = (end.latitude - start.latitude) * Math.PI / 180;
//     const dLon = (end.longitude - start.longitude) * Math.PI / 180;
//     const a =
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return R * c;
//   };

//   const selectOrder = (order: Order) => {
//     setSelectedOrder(order);
//     setOrderModalVisible(false);

//     if (location && order.deliveryAddress) {
//       const destination = {
//         latitude: order.deliveryAddress.lat!,
//         longitude: order.deliveryAddress.lng!,
//       };
//       calculateRoute(location, destination);

//       // Fit map to show both points
//       const coordinates = [location, destination];
//       mapRef.current?.fitToCoordinates(coordinates, {
//         edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
//         animated: true,
//       });
//     }
//   };
//   const startDelivery = async () => {
//     if (!selectedOrder || !location) return;

//     setIsTracking(true);
//     setDeliveryStatus('navigating');

//     // Start location tracking
//     locationWatchRef.current = await Location.watchPositionAsync(
//       {
//         accuracy: Location.Accuracy.High,
//         timeInterval: 5000, // Update every 5 seconds
//         distanceInterval: 10, // Update every 10 meters
//       },
//       (newLocation) => {
//         const newPos = {
//           latitude: newLocation.coords.latitude,
//           longitude: newLocation.coords.longitude,
//         };

//         setLocation(newPos);

//         // Emit location to backend
//         if (socketRef.current) {
//           socketRef.current.emit('locationUpdate', {
//             orderId: selectedOrder._id,
//             lat: newPos.latitude,
//             lng: newPos.longitude,
//           });
//         }
//         // Recalculate route to destination
//         const destination = {
//           latitude: selectedOrder.deliveryAddress!.lat!,
//           longitude: selectedOrder.deliveryAddress!.lng!,
//         };
//         calculateRoute(newPos, destination);

//         // Check if driver is close to destination (within 50 meters)
//         const distanceToDestination = calculateDistance(newPos, destination);
//         if (distanceToDestination < 0.05) { // 50 meters
//           setDeliveryStatus('arrived');
//         }
//       }
//     );

//     // Update order status
//     if (socketRef.current) {
//       socketRef.current.emit('statusUpdate', {
//         orderId: selectedOrder._id,
//         status: 'out_for_delivery',
//       });
//     }
//   };
//   const completeDelivery = () => {
//     if (!selectedOrder) return;

//     setDeliveryStatus('delivering');
//     setDeliveryModalVisible(true);
//   };

//   const confirmDelivery = () => {
//     if (!selectedOrder) return;

//     // Stop tracking
//     if (locationWatchRef.current) {
//       locationWatchRef.current.remove();
//       locationWatchRef.current = null;
//     }

//     // Update order status
//     if (socketRef.current) {
//       socketRef.current.emit('statusUpdate', {
//         orderId: selectedOrder._id,
//         status: 'delivered',
//       });
//     }

//     // Remove order from list
//     setOrders(prev => prev.filter(order => order._id !== selectedOrder._id));
//       // Reset state
//     setSelectedOrder(null);
//     setRoute([]);
//     setIsTracking(false);
//     setEta('');
//     setDistance('');
//     setDeliveryStatus('idle');
//     setDeliveryModalVisible(false);

//   };

//   const openOrdersList = () => {
//     setOrderModalVisible(true);
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#2196F3" />
//         <Text style={styles.loadingText}>Loading map...</Text>
//       </View>
//     );
//   }

//   if (!location) {
//     return (
//       <View style={styles.errorContainer}>
//         <Ionicons name="location-outline" size={64} color="#999" />
//         <Text style={styles.errorText}>Location not available</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={initializeLocation}>
//           <Text style={styles.retryButtonText}>Retry</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#1976D2" />

//       {/* Header */}
//       <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Delivery Map</Text>
//         <TouchableOpacity onPress={openOrdersList} style={styles.ordersButton}>
//           <Ionicons name="list" size={24} color="#fff" />
//           {orders.length > 0 && (
//             <View style={styles.badge}>
//               <Text style={styles.badgeText}>{orders.length}</Text>
//             </View>
//           )}
//         </TouchableOpacity>
//       </LinearGradient>

//       {/* Map */}
//       <MapView
//         ref={mapRef}
//         style={styles.map}
//         provider={PROVIDER_GOOGLE}
//         initialRegion={{
//           ...location,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//         showsUserLocation={true}
//         showsMyLocationButton={false}
//         showsTraffic={true}
//       >
//         {/* Restaurant Marker */}
//         <Marker
//           coordinate={restaurantLocation!}
//           title="Restaurant"
//           description="Starting point"
//         >
//           <View style={styles.restaurantMarker}>
//             <Ionicons name="restaurant" size={20} color="#fff" />
//           </View>
//         </Marker>

//         {/* Current Location Circle */}
//         <Circle
//           center={location}
//           radius={50}
//           fillColor="rgba(33, 150, 243, 0.3)"
//           strokeColor="rgba(33, 150, 243, 0.8)"
//           strokeWidth={2}
//         />

//         {/* Selected Order Destination */}
//         {selectedOrder && (
//           <Marker
//             coordinate={{
//               latitude: selectedOrder.deliveryAddress!.lat!,
//               longitude: selectedOrder.deliveryAddress!.lng!,
//             }}
//             title={`Delivery to ${selectedOrder.customer.name}`}
//             description={`${selectedOrder.deliveryAddress!.street} ${selectedOrder.deliveryAddress!?.streetNumber || ''}`}
//           >
//             <View style={styles.destinationMarker}>
//               <Ionicons name="home" size={20} color="#fff" />
//             </View>
//           </Marker>
//         )}

//         {/* Route Polyline */}
//         {route.length > 0 && (
//           <Polyline
//             coordinates={route}
//             strokeColor="#2196F3"
//             strokeWidth={4}
//             lineDashPattern={[5, 5]}
//           />        )}
//       </MapView>

//       {/* Delivery Status Indicator */}
//       <DeliveryStatusIndicator
//         status={deliveryStatus}
//         eta={eta}
//         distance={distance}
//         customerName={selectedOrder?.customer.name}
//       />

//       {/* Bottom Info Panel */}
//       {selectedOrder && (
//         <View style={styles.infoPanel}>
//           <View style={styles.infoHeader}>
//             <Text style={styles.customerName}>{selectedOrder.customer.name}</Text>
//             <Text style={styles.orderAmount}>€{selectedOrder.totalAmount.toFixed(2)}</Text>
//           </View>

//           <View style={styles.addressContainer}>
//             <Ionicons name="location" size={16} color="#666" />
//             <Text style={styles.addressText}>
//               {selectedOrder.deliveryAddress!.street} {selectedOrder.deliveryAddress!?.streetNumber || ''}, {selectedOrder.deliveryAddress!.city}
//             </Text>
//           </View>

//           {distance && eta && (
//             <View style={styles.etaContainer}>
//               <View style={styles.etaItem}>
//                 <Ionicons name="speedometer" size={16} color="#2196F3" />
//                 <Text style={styles.etaText}>{distance}</Text>
//               </View>
//               <View style={styles.etaItem}>
//                 <Ionicons name="time" size={16} color="#2196F3" />
//                 <Text style={styles.etaText}>{eta}</Text>
//               </View>
//             </View>
//           )}

//           <View style={styles.actionButtons}>
//             {!isTracking ? (
//               <TouchableOpacity style={styles.startButton} onPress={startDelivery}>
//                 <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.buttonGradient}>
//                   <Ionicons name="play" size={20} color="#fff" />
//                   <Text style={styles.buttonText}>Start Delivery</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             ) : (
//               <TouchableOpacity style={styles.completeButton} onPress={completeDelivery}>
//                 <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.buttonGradient}>
//                   <Ionicons name="checkmark" size={20} color="#fff" />
//                   <Text style={styles.buttonText}>Complete Delivery</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             )}

//             <TouchableOpacity
//               style={styles.callButton}
//               onPress={() => {
//                 // In production, use Linking.openURL(`tel:${selectedOrder.customer.phone}`)
//                 // showNotificationModal('Call Customer', selectedOrder.customer.phone);
//               }}
//             >
//               <Ionicons name="call" size={20} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}

//       {/* Orders List Modal */}
//       <CustomModal
//         visible={orderModalVisible}
//         onClose={() => setOrderModalVisible(false)}
//         title="Available Orders"
//       >
//         <ScrollView style={styles.ordersList}>
//           {orders.map((order) => (
//             <TouchableOpacity
//               key={order._id}
//               style={styles.orderItem}
//               onPress={() => selectOrder(order)}
//             >
//               <View style={styles.orderHeader}>
//                 <Text style={styles.orderCustomer}>{order.customer.name}</Text>
//                 <Text style={styles.orderAmount}>€{order.totalAmount.toFixed(2)}</Text>
//               </View>
//               <Text style={styles.orderAddress}>
//                 {order.deliveryAddress!.street} {order.deliveryAddress!?.streetNumber || ''}
//               </Text>
//               <Text style={styles.orderItems}>
//                 {order.items.length} item{order.items.length > 1 ? 's' : ''}
//               </Text>
//             </TouchableOpacity>
//           ))}
//           {orders.length === 0 && (
//             <View style={styles.noOrders}>
//               <Ionicons name="clipboard-outline" size={48} color="#ccc" />
//               <Text style={styles.noOrdersText}>No orders available</Text>
//             </View>
//           )}
//         </ScrollView>
//       </CustomModal>

//       {/* Delivery Confirmation Modal */}
//       <CustomModal
//         visible={deliveryModalVisible}
//         onClose={() => setDeliveryModalVisible(false)}
//         title="Confirm Delivery"
//         type="success"
//       >
//         <View style={styles.confirmationContent}>
//           <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
//           <Text style={styles.confirmationText}>
//             Are you sure you want to mark this delivery as complete?
//           </Text>
//           <View style={styles.confirmationButtons}>
//             <TouchableOpacity
//               style={[styles.confirmButton, styles.cancelButton]}
//               onPress={() => setDeliveryModalVisible(false)}
//             >
//               <Text style={styles.cancelButtonText}>Cancel</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.confirmButton, styles.confirmDeliveryButton]}
//               onPress={confirmDelivery}
//             >
//               <Text style={styles.confirmButtonText}>Confirm</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </CustomModal>

//       {/* Location Permission Modal */}
//       <CustomModal
//         visible={locationPermissionModal}
//         onClose={() => setLocationPermissionModal(false)}
//         title="Location Permission Required"
//         type="error"
//       >
//         <View style={styles.permissionContent}>
//           <Ionicons name="location-outline" size={64} color="#f44336" />
//           <Text style={styles.permissionText}>
//             Location permission is required to track deliveries and provide navigation.
//           </Text>
//           <TouchableOpacity
//             style={styles.permissionButton}
//             onPress={() => {
//               setLocationPermissionModal(false);
//               initializeLocation();
//             }}
//           >
//             <Text style={styles.permissionButtonText}>Grant Permission</Text>
//           </TouchableOpacity>
//         </View>
//       </CustomModal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#f5f5f5',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#666',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#f5f5f5',
//     paddingHorizontal: 32,
//   },
//   errorText: {
//     fontSize: 18,
//     color: '#666',
//     marginTop: 16,
//     textAlign: 'center',
//   },
//   retryButton: {
//     marginTop: 24,
//     backgroundColor: '#2196F3',
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     paddingTop: Platform.OS === 'ios' ? 12 : 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   backButton: {
//     padding: 8,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   ordersButton: {
//     padding: 8,
//     position: 'relative',
//   },
//   badge: {
//     position: 'absolute',
//     top: 4,
//     right: 4,
//     backgroundColor: '#f44336',
//     borderRadius: 10,
//     minWidth: 20,
//     height: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   map: {
//     flex: 1,
//   },
//   restaurantMarker: {
//     backgroundColor: '#FF9800',
//     borderRadius: 20,
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   destinationMarker: {
//     backgroundColor: '#4CAF50',
//     borderRadius: 20,
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   infoPanel: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 8,
//     maxHeight: height * 0.4,
//   },
//   infoHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   customerName: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//   },
//   orderAmount: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#4CAF50',
//   },
//   addressContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   addressText: {
//     fontSize: 14,
//     color: '#666',
//     marginLeft: 8,
//     flex: 1,
//   },
//   etaContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 16,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     paddingVertical: 12,
//   },
//   etaItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   etaText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginLeft: 6,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   startButton: {
//     flex: 1,
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   completeButton: {
//     flex: 1,
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   buttonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   callButton: {
//     backgroundColor: '#2196F3',
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   // Modal Styles
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     width: width * 0.9,
//     maxHeight: height * 0.8,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   closeButton: {
//     padding: 4,
//   },
//   modalContent: {
//     padding: 20,
//   },
//   ordersList: {
//     maxHeight: height * 0.5,
//   },
//   orderItem: {
//     backgroundColor: '#f8f9fa',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#e9ecef',
//   },
//   orderHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   orderCustomer: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//   },
//   orderAddress: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 4,
//   },
//   orderItems: {
//     fontSize: 12,
//     color: '#999',
//   },
//   noOrders: {
//     alignItems: 'center',
//     paddingVertical: 32,
//   },
//   noOrdersText: {
//     fontSize: 16,
//     color: '#999',
//     marginTop: 12,
//   },
//   confirmationContent: {
//     alignItems: 'center',
//     paddingVertical: 20,
//   },
//   confirmationText: {
//     fontSize: 16,
//     color: '#333',
//     textAlign: 'center',
//     marginVertical: 20,
//     lineHeight: 24,
//   },
//   confirmationButtons: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 20,
//   },
//   confirmButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#f8f9fa',
//     borderWidth: 1,
//     borderColor: '#dee2e6',
//   },
//   confirmDeliveryButton: {
//     backgroundColor: '#4CAF50',
//   },
//   cancelButtonText: {
//     color: '#666',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   confirmButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   permissionContent: {
//     alignItems: 'center',
//     paddingVertical: 20,
//   },
//   permissionText: {
//     fontSize: 16,
//     color: '#333',
//     textAlign: 'center',
//     marginVertical: 20,
//     lineHeight: 24,
//   },
//   permissionButton: {
//     backgroundColor: '#2196F3',
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginTop: 20,
//   },
//   permissionButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });
