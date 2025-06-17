import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  priority?: "low" | "normal" | "high" | "max";
  categoryId?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private isInitialized: boolean = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  static async initialize(): Promise<boolean> {
    try {
      await NotificationService.getInstance().initialize();
      return true;
    } catch (error) {
      console.error("Error initializing NotificationService:", error);
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Demander les permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Notifications Required",
          "Please enable notifications to receive delivery updates."
        );
        return;
      }

      // Obtenir le token push
      if (Device.isDevice) {
        this.pushToken = (await Notifications.getExpoPushTokenAsync()).data;
        await AsyncStorage.setItem("pushToken", this.pushToken);
        console.log("Push token:", this.pushToken);
      } else {
        console.warn("Must use physical device for Push Notifications");
      }

      // Configuration Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("delivery", {
          name: "Delivery Updates",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "notification.wav",
        });

        await Notifications.setNotificationChannelAsync("orders", {
          name: "New Orders",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: "#00FF00",
          sound: "order_notification.wav",
        });

        await Notifications.setNotificationChannelAsync("achievements", {
          name: "Achievements",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 200],
          lightColor: "#FFD700",
          sound: "achievement.wav",
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
    }
  }
  async scheduleNotification(
    notification: NotificationData,
    delay: number = 0
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false ? "default" : undefined,
          priority: this.mapPriority(notification.priority || "normal"),
          categoryIdentifier: notification.categoryId,
        },
        trigger:
          delay > 0
            ? {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: delay,
              }
            : null,
      });

      return notificationId;
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      return "";
    }
  }

  // Alias pour compatibilité avec d'autres services
  async sendNotification(type: string, data: any): Promise<void> {
    await this.showLocalNotification({
      title: data.title || "Notification",
      body: data.body || "New notification",
      data: { type, ...data },
      priority: data.priority || "normal",
    });
  }

  async showLocalNotification(notification: NotificationData): Promise<void> {
    await this.scheduleNotification(notification, 0);
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  // Notifications prédéfinies pour l'app livreur
  async notifyNewOrder(orderDetails: any): Promise<void> {
    await this.showLocalNotification({
      title: "🚀 New Delivery Order!",
      body: `Order #${orderDetails.id.slice(-4)} - ${
        orderDetails.customerName
      }`,
      data: {
        type: "new_order",
        orderId: orderDetails.id,
        screen: "OrderDetail",
      },
      priority: "high",
      categoryId: "orders",
    });
  }
  async notifyOrderStatusUpdate(
    orderDetails: any,
    newStatus: string
  ): Promise<void> {
    const statusMessages: Record<string, string> = {
      "ready for delivery": "📦 Order ready for pickup!",
      "out for delivery": "🚗 You're on your way!",
      delivered: "✅ Order delivered successfully!",
      cancelled: "❌ Order has been cancelled",
    };

    await this.showLocalNotification({
      title: "Order Status Update",
      body: statusMessages[newStatus] || `Order status: ${newStatus}`,
      data: {
        type: "status_update",
        orderId: orderDetails.id,
        status: newStatus,
      },
      priority: "normal",
      categoryId: "delivery",
    });
  }

  async notifyAchievement(achievement: any): Promise<void> {
    await this.showLocalNotification({
      title: "🏆 Achievement Unlocked!",
      body: `${achievement.name} - ${achievement.description}`,
      data: {
        type: "achievement",
        achievementId: achievement.id,
        screen: "Gamification",
      },
      priority: "normal",
      categoryId: "achievements",
    });
  }

  async notifyDailyGoal(progress: number, target: number): Promise<void> {
    const percentage = Math.round((progress / target) * 100);
    await this.showLocalNotification({
      title: "📊 Daily Progress",
      body: `${percentage}% complete - ${progress}/${target} deliveries`,
      data: {
        type: "daily_progress",
        progress,
        target,
        screen: "Dashboard",
      },
      priority: "low",
      categoryId: "achievements",
    });
  }

  async notifyLocationReminder(): Promise<void> {
    await this.showLocalNotification({
      title: "📍 Location Service",
      body: "Please enable location sharing for accurate tracking",
      data: {
        type: "location_reminder",
        screen: "Settings",
      },
      priority: "normal",
      categoryId: "delivery",
    });
  }

  private mapPriority(
    priority: string
  ): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case "low":
        return Notifications.AndroidNotificationPriority.LOW;
      case "normal":
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case "high":
        return Notifications.AndroidNotificationPriority.HIGH;
      case "max":
        return Notifications.AndroidNotificationPriority.MAX;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Gestion des listeners
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Notification rich avec actions
  async scheduleInteractiveNotification(
    title: string,
    body: string,
    actions: Array<{ id: string; title: string }>,
    data?: any
  ): Promise<string> {
    // Définir les catégories d'actions
    await Notifications.setNotificationCategoryAsync(
      "order_actions",
      actions.map((action) => ({
        identifier: action.id,
        buttonTitle: action.title,
        options: {
          opensAppToForeground: true,
        },
      }))
    );

    return await this.scheduleNotification({
      title,
      body,
      data,
      categoryId: "order_actions",
      priority: "high",
    });
  }
}

export default NotificationService;
