import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Share,
  Linking,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/hooks/useAuth";
import { ApiService } from "@/src/services";
import { User } from "@/src/types";
import { useTheme, Theme } from "@/src/contexts/ThemeContext";
import { useThemedStyles } from "@/src/hooks/useThemedStyles";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/src/store";
import {
  setUserProfile,
  updateUserProfile,
  setLoading,
  setError,
} from "@/src/store/slices/userSlice";

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: "toggle" | "navigation" | "action";
  value?: boolean;
  action?: () => void;
  category: "profile" | "notifications" | "app" | "support" | "legal";
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const dispatch = useDispatch();

  // Utilisation du store Redux pour le profil utilisateur
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const userLoading = useSelector((state: RootState) => state.user.loading);
  const userError = useSelector((state: RootState) => state.user.error);

  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  // État local temporaire pour le formulaire de modification du profil
  const [tempProfile, setTempProfile] = useState<User>({
    _id: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    status: "active",
    createdAt: "",
    updatedAt: "",
  });

  const styles = useThemedStyles(createThemedStyles);
  const [settings, setSettings] = useState({
    notifications: {
      newOrders: true,
      deliveryUpdates: true,
      promotions: false,
      maintenance: true,
      sound: true,
      vibration: true,
    },
    privacy: {
      shareLocation: true,
      analytics: false,
      crashReports: true,
    },
    app: {
      darkMode: false, // Will be synced with theme in useEffect
      autoRefresh: true,
      offlineMode: false,
      dataUsage: "normal", // 'low', 'normal', 'high'
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadUserProfile();
    }
  }, [isAuthenticated]);

  // Sync theme state with global theme
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      app: {
        ...prev.app,
        darkMode: isDark,
      },
    }));
  }, [isDark]);

  // Synchroniser tempProfile avec userProfile quand la modal s'ouvre
  useEffect(() => {
    if (profileModalVisible && userProfile) {
      setTempProfile(userProfile);
    }
  }, [profileModalVisible, userProfile]);

  const loadUserProfile = async () => {
    try {
      dispatch(setLoading(true));
      const profile = await ApiService.getDriverProfile();

      const userProfileData: User = {
        _id: profile._id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || "",
        status: profile.status || "active",
        createdAt: profile.createdAt || "",
        updatedAt: profile.updatedAt || "",
      };

      // Mettre à jour le store Redux
      dispatch(setUserProfile(userProfileData));

      // Initialiser le formulaire temporaire avec les données du profil
      setTempProfile(userProfileData);
    } catch (error) {
      console.error("Error loading user profile:", error);
      dispatch(setError("Unable to load user profile"));
      Alert.alert("Error", "Unable to load user profile");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleUserLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            logout();
            router.replace("/login");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
    if (Platform.OS === "web") {
      try {
        logout();
        router.replace("/login");
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };
  const handleUserProfileUpdate = async (updatedUser: User) => {
    try {
      await ApiService.updateDriverProfile(updatedUser);

      // Mettre à jour le store Redux
      dispatch(updateUserProfile(updatedUser));

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      dispatch(setError("Unable to update profile"));
      Alert.alert("Error", "Unable to update profile");
    }
  };

  const settingsItems: SettingsItem[] = [
    // Profile
    {
      id: "profile",
      title: "Edit Profile",
      subtitle: "Name, email, phone",
      icon: "person-outline",
      type: "navigation",
      // action: () => setProfileModalVisible(true),
      action: () => Alert.alert("Profile", "Profile editing coming soon"),
      category: "profile",
    },
    {
      id: "documents",
      title: "Documents",
      subtitle: "ID, license, insurance",
      icon: "document-text-outline",
      type: "navigation",
      action: () => Alert.alert("Documents", "Document management coming soon"),
      category: "profile",
    },

    // Notifications
    {
      id: "newOrders",
      title: "New Orders",
      subtitle: "Receive order notifications",
      icon: "notifications-outline",
      type: "toggle",
      value: settings.notifications.newOrders,
      category: "notifications",
    },
    {
      id: "deliveryUpdates",
      title: "Delivery Updates",
      subtitle: "Notifications during delivery",
      icon: "bicycle-outline",
      type: "toggle",
      value: settings.notifications.deliveryUpdates,
      category: "notifications",
    },
    {
      id: "promotions",
      title: "Promotions and Offers",
      subtitle: "Receive special offers",
      icon: "pricetag-outline",
      type: "toggle",
      value: settings.notifications.promotions,
      category: "notifications",
    },
    {
      id: "sound",
      title: "Notification Sound",
      icon: "volume-high-outline",
      type: "toggle",
      value: settings.notifications.sound,
      category: "notifications",
    },

    // App settings
    {
      id: "darkMode",
      title: "Dark Mode",
      subtitle: "Dark theme interface",
      icon: "moon-outline",
      type: "toggle",
      value: isDark,
      category: "app",
    },
    {
      id: "autoRefresh",
      title: "Actualisation automatique",
      subtitle: "Actualiser les données automatiquement",
      icon: "refresh-outline",
      type: "toggle",
      value: settings.app.autoRefresh,
      category: "app",
    },
    {
      id: "shareLocation",
      title: "Partage de localisation",
      subtitle: "Improve delivery tracking",
      icon: "location-outline",
      type: "toggle",
      value: settings.privacy.shareLocation,
      category: "app",
    },

    // Support
    {
      id: "help",
      title: "Help Center",
      subtitle: "FAQ and Support",
      icon: "help-circle-outline",
      type: "navigation",
      action: () => Alert.alert("Help", "Help center coming soon"),
      category: "support",
    },
    {
      id: "contact",
      title: "Contact Us",
      subtitle: "Technical and Commercial Support",
      icon: "mail-outline",
      type: "navigation",
      action: () => Linking.openURL("mailto:support@delivery-app.com"),
      category: "support",
    },
    {
      id: "feedback",
      title: "Send Feedback",
      subtitle: "Your feedback helps us improve",
      icon: "chatbubble-outline",
      type: "navigation",
      action: () => Alert.alert("Feedback", "Feedback form coming soon"),
      category: "support",
    },

    // Legal
    {
      id: "terms",
      title: "Terms of Service",
      icon: "document-outline",
      type: "navigation",
      action: () => Alert.alert("Terms", "Terms of Service"),
      category: "legal",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      icon: "shield-outline",
      type: "navigation",
      action: () => Alert.alert("Privacy", "Privacy Policy"),
      category: "legal",
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    // load user profile
    try {
      await loadUserProfile();
      Alert.alert("Success", "Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      Alert.alert("Error", "Unable to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleSetting = (settingId: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev };

      switch (settingId) {
        case "newOrders":
          newSettings.notifications.newOrders = !prev.notifications.newOrders;
          break;
        case "deliveryUpdates":
          newSettings.notifications.deliveryUpdates =
            !prev.notifications.deliveryUpdates;
          break;
        case "promotions":
          newSettings.notifications.promotions = !prev.notifications.promotions;
          break;
        case "sound":
          newSettings.notifications.sound = !prev.notifications.sound;
          break;
        case "darkMode":
          toggleTheme();
          break;
        case "autoRefresh":
          newSettings.app.autoRefresh = !prev.app.autoRefresh;
          break;
        case "shareLocation":
          newSettings.privacy.shareLocation = !prev.privacy.shareLocation;
          break;
      }

      return newSettings;
    });
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: "Join me on the delivery app! Download it now.",
        title: "Delivery App",
      });
    } catch (error) {
      Alert.alert("Error", "Unable to share application");
    }
  };

  const renderProfileHeader = () => (
    <LinearGradient
      colors={["#667eea", "#764ba2"]}
      style={styles.profileHeader}
    >
      <View style={styles.profileInfo}>
        {" "}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userProfile?.firstName
              .split(" ")
              .map((n) => n[0])
              .join("") || "U"}
          </Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>
            {userProfile?.firstName} {userProfile?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{userProfile?.email}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderSettingsSection = (
    category: string,
    title: string,
    items: SettingsItem[]
  ) => (
    <View style={styles.section} key={category}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.settingItem,
              index === items.length - 1 && styles.settingItemLast,
            ]}
            onPress={item.type === "navigation" ? item.action : undefined}
            disabled={item.type === "toggle"}
          >
            {" "}
            <View style={styles.settingIcon}>
              <Ionicons
                name={item.icon as any}
                size={22}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              )}
            </View>
            <View style={styles.settingAction}>
              {item.type === "toggle" ? (
                <Switch
                  value={item.value}
                  onValueChange={() => handleToggleSetting(item.id)}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={item.value ? "#fff" : "#f4f3f4"}
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textSecondary}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProfileModal = () => (
    <Modal
      visible={profileModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>{" "}
          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={tempProfile.firstName}
                onChangeText={(text) =>
                  setTempProfile((prev) => ({ ...prev, firstName: text }))
                }
                placeholder="Your first name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={tempProfile.lastName}
                onChangeText={(text) =>
                  setTempProfile((prev) => ({ ...prev, lastName: text }))
                }
                placeholder="Your last name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={tempProfile.email}
                onChangeText={(text) =>
                  setTempProfile((prev) => ({ ...prev, email: text }))
                }
                placeholder="your.email@example.com"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={tempProfile.phone}
                onChangeText={(text) =>
                  setTempProfile((prev) => ({ ...prev, phone: text }))
                }
                placeholder="Your phone number"
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>{" "}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                handleUserProfileUpdate(tempProfile);
                setProfileModalVisible(false);
              }}
            >
              <Text
                style={[styles.modalButtonText, styles.modalButtonTextPrimary]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const groupedSettings = {
    profile: settingsItems.filter((item) => item.category === "profile"),
    notifications: settingsItems.filter(
      (item) => item.category === "notifications"
    ),
    app: settingsItems.filter((item) => item.category === "app"),
    support: settingsItems.filter((item) => item.category === "support"),
    legal: settingsItems.filter((item) => item.category === "legal"),
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backToDashboard}
          onPress={() => router.push("/(tabs)" as any)}
        >
          <Ionicons
            name="home-outline"
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.backToDashboardText}>Home</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => setProfileModalVisible(true)}
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderProfileHeader()}

        {renderSettingsSection("profile", "Profile", groupedSettings.profile)}
        {renderSettingsSection(
          "notifications",
          "Notifications",
          groupedSettings.notifications
        )}
        {renderSettingsSection("app", "Application", groupedSettings.app)}
        {renderSettingsSection("support", "Support", groupedSettings.support)}
        {renderSettingsSection("legal", "Legal", groupedSettings.legal)}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareApp}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.actionButtonText}>Share App</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleUserLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={theme.colors.error}
              />
              <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2024 Delivery App</Text>
        </View>
      </ScrollView>

      {renderProfileModal()}
    </SafeAreaView>
  );
}

const createThemedStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backToDashboard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      gap: 4,
    },
    backToDashboardText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      flex: 1,
      textAlign: "center",
    },
    editProfileButton: {
      padding: 8,
    },
    scrollView: {
      flex: 1,
    },
    profileHeader: {
      padding: 20,
      paddingTop: 40,
    },
    profileInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
    },
    profileDetails: {
      flex: 1,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "bold",
      color: "white",
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: 12,
    },
    profileStats: {
      flexDirection: "row",
      gap: 16,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: "white",
    },
    statLabel: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: 4,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    sectionContent: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: "hidden",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    settingSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    settingAction: {
      marginLeft: 8,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 8,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    logoutButton: {
      borderBottomWidth: 0,
    },
    logoutButtonText: {
      color: theme.colors.error,
    },
    footer: {
      padding: 20,
      alignItems: "center",
      marginTop: 20,
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.dark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      margin: 20,
      maxHeight: "80%",
      width: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    modalBody: {
      padding: 20,
      maxHeight: 400,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      alignItems: "center",
    },
    modalButtonPrimary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "600",
    },
    modalButtonTextPrimary: {
      color: "white",
    },
  });
