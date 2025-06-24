import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  reward: {
    type: "points" | "badge" | "bonus";
    value: number | string;
  };
  category: "delivery" | "service" | "efficiency" | "milestone";
}

interface Level {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  color: string[];
  perks: string[];
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  timeLeft: string;
  reward: number;
  type: "daily" | "weekly" | "special";
}

export default function GamificationTab() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    level: 8,
    currentPoints: 2850,
    totalPoints: 15420,
    weeklyPoints: 340,
    streak: 12,
    completedDeliveries: 156,
    rating: 4.8,
    badges: 8,
    achievements: 12,
  });

  const [levels] = useState<Level[]>([
    {
      level: 1,
      title: "Débutant",
      minPoints: 0,
      maxPoints: 500,
      color: ["#95A5A6", "#BDC3C7"],
      perks: ["Support prioritaire"],
    },
    {
      level: 2,
      title: "Apprenti",
      minPoints: 501,
      maxPoints: 1000,
      color: ["#3498DB", "#5DADE2"],
      perks: ["Bonus +5%"],
    },
    {
      level: 3,
      title: "Coursier",
      minPoints: 1001,
      maxPoints: 1800,
      color: ["#2ECC71", "#58D68D"],
      perks: ["Bonus +10%", "Missions premium"],
    },
    {
      level: 4,
      title: "Expert",
      minPoints: 1801,
      maxPoints: 3000,
      color: ["#F39C12", "#F7DC6F"],
      perks: ["Bonus +15%", "Horaires flexibles"],
    },
    {
      level: 5,
      title: "Vétéran",
      minPoints: 3001,
      maxPoints: 5000,
      color: ["#E74C3C", "#EC7063"],
      perks: ["Bonus +20%", "Zones premium"],
    },
    {
      level: 6,
      title: "Maître",
      minPoints: 5001,
      maxPoints: 8000,
      color: ["#9B59B6", "#BB8FCE"],
      perks: ["Bonus +25%", "Formation avancée"],
    },
    {
      level: 7,
      title: "Champion",
      minPoints: 8001,
      maxPoints: 12000,
      color: ["#E67E22", "#F8C471"],
      perks: ["Bonus +30%", "Équipement premium"],
    },
    {
      level: 8,
      title: "Légende",
      minPoints: 12001,
      maxPoints: 18000,
      color: ["#1ABC9C", "#76D7C4"],
      perks: ["Bonus +35%", "Accès VIP"],
    },
    {
      level: 9,
      title: "Élite",
      minPoints: 18001,
      maxPoints: 25000,
      color: ["#34495E", "#5D6D7E"],
      perks: ["Bonus +40%", "Mentor certifié"],
    },
    {
      level: 10,
      title: "Grand Maître",
      minPoints: 25001,
      maxPoints: 999999,
      color: ["#FFD700", "#FFF8DC"],
      perks: ["Bonus +50%", "Statut légendaire"],
    },
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: "1",
      title: "Premier pas",
      description: "Complete your first delivery",
      icon: "footsteps-outline",
      progress: 1,
      maxProgress: 1,
      completed: true,
      reward: { type: "points", value: 50 },
      category: "milestone",
    },
    {
      id: "2",
      title: "Marathonien",
      description: "Complete 100 deliveries",
      icon: "trophy-outline",
      progress: 156,
      maxProgress: 100,
      completed: true,
      reward: { type: "badge", value: "Marathonien" },
      category: "milestone",
    },
    {
      id: "3",
      title: "Vitesse éclair",
      description: "Livrer en moins de 15 minutes",
      icon: "flash-outline",
      progress: 23,
      maxProgress: 50,
      completed: false,
      reward: { type: "points", value: 200 },
      category: "efficiency",
    },
    {
      id: "4",
      title: "Service parfait",
      description: "Maintenir une note de 4.8/5",
      icon: "star-outline",
      progress: 48,
      maxProgress: 50,
      completed: false,
      reward: { type: "bonus", value: "10%" },
      category: "service",
    },
    {
      id: "5",
      title: "Série victorieuse",
      description: "Livrer 7 jours consécutifs",
      icon: "calendar-outline",
      progress: 12,
      maxProgress: 7,
      completed: true,
      reward: { type: "points", value: 150 },
      category: "delivery",
    },
    {
      id: "6",
      title: "Roi de la route",
      description: "Travel 500km in deliveries",
      icon: "car-outline",
      progress: 387,
      maxProgress: 500,
      completed: false,
      reward: { type: "badge", value: "Roi de la route" },
      category: "delivery",
    },
  ]);

  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: "1",
      title: "Défi quotidien",
      description: "Complete 5 deliveries today",
      icon: "today-outline",
      progress: 3,
      target: 5,
      timeLeft: "8h 23min",
      reward: 100,
      type: "daily",
    },
    {
      id: "2",
      title: "Sprint hebdomadaire",
      description: "Gagner 500 points cette semaine",
      icon: "trending-up-outline",
      progress: 340,
      target: 500,
      timeLeft: "3j 14h",
      reward: 250,
      type: "weekly",
    },
    {
      id: "3",
      title: "Mission spéciale",
      description: "Livrer dans 3 quartiers différents",
      icon: "location-outline",
      progress: 2,
      target: 3,
      timeLeft: "2j 5h",
      reward: 500,
      type: "special",
    },
  ]);

  const currentLevel =
    levels.find(
      (level) =>
        userStats.currentPoints >= level.minPoints &&
        userStats.currentPoints <= level.maxPoints
    ) || levels[0];

  const nextLevel = levels.find(
    (level) => level.level === currentLevel.level + 1
  );

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate data loading
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderLevelCard = () => (
    <LinearGradient colors={currentLevel.color as any} style={styles.levelCard}>
      <View style={styles.levelHeader}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelNumber}>Niveau {currentLevel.level}</Text>
          <Text style={styles.levelTitle}>{currentLevel.title}</Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={styles.currentPoints}>{userStats.currentPoints}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
      </View>

      {nextLevel && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((userStats.currentPoints - currentLevel.minPoints) /
                      (nextLevel.minPoints - currentLevel.minPoints)) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {nextLevel.minPoints - userStats.currentPoints} points pour{" "}
            {nextLevel.title}
          </Text>
        </View>
      )}

      <View style={styles.perksContainer}>
        <Text style={styles.perksTitle}>Avantages actuels :</Text>
        {currentLevel.perks.map((perk, index) => (
          <View key={index} style={styles.perkItem}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );

  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <LinearGradient
          colors={["#FF6B6B", "#FF8E8E"]}
          style={styles.statGradient}
        >
          <Ionicons name="flame-outline" size={24} color="white" />
          <Text style={styles.statValue}>{userStats.streak}</Text>
          <Text style={styles.statLabel}>Jours consécutifs</Text>
        </LinearGradient>
      </View>

      <View style={styles.statCard}>
        <LinearGradient
          colors={["#4ECDC4", "#7BDBD4"]}
          style={styles.statGradient}
        >
          <Ionicons name="bicycle-outline" size={24} color="white" />
          <Text style={styles.statValue}>{userStats.completedDeliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </LinearGradient>
      </View>

      <View style={styles.statCard}>
        <LinearGradient
          colors={["#FFE66D", "#FFF176"]}
          style={styles.statGradient}
        >
          <Ionicons name="star-outline" size={24} color="white" />
          <Text style={styles.statValue}>{userStats.rating}</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
        </LinearGradient>
      </View>

      <View style={styles.statCard}>
        <LinearGradient
          colors={["#A8E6CF", "#C8F7C5"]}
          style={styles.statGradient}
        >
          <Ionicons name="ribbon-outline" size={24} color="white" />
          <Text style={styles.statValue}>{userStats.badges}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </LinearGradient>
      </View>
    </View>
  );

  const renderChallenges = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🎯 Défis actifs</Text>
      {challenges.map((challenge) => (
        <View key={challenge.id} style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeInfo}>
              <View style={styles.challengeIconContainer}>
                <Ionicons
                  name={challenge.icon as any}
                  size={20}
                  color="#007AFF"
                />
              </View>
              <View style={styles.challengeText}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>
                  {challenge.description}
                </Text>
              </View>
            </View>
            <View style={styles.challengeReward}>
              <Text style={styles.rewardText}>+{challenge.reward}</Text>
              <Text style={styles.rewardLabel}>pts</Text>
            </View>
          </View>

          <View style={styles.challengeProgress}>
            <View style={styles.progressInfo}>
              {" "}
              <Text style={styles.challengeProgressText}>
                {challenge.progress}/{challenge.target}
              </Text>
              <Text style={styles.timeLeft}>{challenge.timeLeft} restant</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${
                        (challenge.progress / challenge.target) * 100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🏆 Achievements</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.achievementsScroll}
      >
        {achievements.map((achievement) => (
          <TouchableOpacity
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.completed && styles.achievementCompleted,
            ]}
            onPress={() =>
              Alert.alert(achievement.title, achievement.description)
            }
          >
            <View
              style={[
                styles.achievementIcon,
                achievement.completed && styles.achievementIconCompleted,
              ]}
            >
              <Ionicons
                name={achievement.icon as any}
                size={24}
                color={achievement.completed ? "#FFD700" : "#ccc"}
              />
            </View>
            <Text
              style={[
                styles.achievementTitle,
                achievement.completed && styles.achievementTitleCompleted,
              ]}
            >
              {achievement.title}
            </Text>
            <View style={styles.achievementProgress}>
              <View style={styles.achievementProgressBar}>
                <View
                  style={[
                    styles.achievementProgressFill,
                    {
                      width: `${Math.min(
                        (achievement.progress / achievement.maxProgress) * 100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.achievementProgressText}>
                {Math.min(achievement.progress, achievement.maxProgress)}/
                {achievement.maxProgress}
              </Text>
            </View>
            {achievement.completed && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backToDashboard}
            onPress={() => router.push("/(tabs)" as any)}
          >
            <Ionicons name="home-outline" size={20} color="#007AFF" />
            <Text style={styles.backToDashboardText}>Home</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>🎮 Gamification</Text>
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() =>
              Alert.alert("Classement", "Fonctionnalité bientôt disponible !")
            }
          >
            <Ionicons name="podium-outline" size={20} color="#007AFF" />
            <Text style={styles.leaderboardText}>Classement</Text>
          </TouchableOpacity>
        </View>
        {renderLevelCard()}
        {renderStatsGrid()}
        {renderChallenges()}
        {renderAchievements()}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Points totaux gagnés : {userStats.totalPoints.toLocaleString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
    textAlign: "center",
  },
  leaderboardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  leaderboardText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  levelCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelNumber: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  levelTitle: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
    marginTop: 4,
  },
  pointsContainer: {
    alignItems: "flex-end",
  },
  currentPoints: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
  },
  pointsLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 8,
    textAlign: "center",
  },
  perksContainer: {
    marginTop: 8,
  },
  perksTitle: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
    marginBottom: 8,
  },
  perkItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  perkText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statGradient: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  challengeCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  challengeInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  challengeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  challengeText: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  challengeDescription: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 2,
  },
  challengeReward: {
    alignItems: "center",
  },
  rewardText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e67e22",
  },
  rewardLabel: {
    fontSize: 12,
    color: "#95a5a6",
  },
  challengeProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressInfo: {
    minWidth: 80,
  },
  challengeProgressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  timeLeft: {
    fontSize: 12,
    color: "#e74c3c",
    marginTop: 2,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#ecf0f1",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 3,
  },
  achievementsScroll: {
    paddingLeft: 16,
  },
  achievementCard: {
    width: 120,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: "relative",
  },
  achievementCompleted: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementIconCompleted: {
    backgroundColor: "#fff3e0",
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 8,
  },
  achievementTitleCompleted: {
    color: "#2c3e50",
  },
  achievementProgress: {
    width: "100%",
    alignItems: "center",
  },
  achievementProgressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#ecf0f1",
    borderRadius: 2,
    overflow: "hidden",
  },
  achievementProgressFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 2,
  },
  achievementProgressText: {
    fontSize: 10,
    color: "#95a5a6",
    marginTop: 4,
  },
  completedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  footer: {
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#95a5a6",
    fontStyle: "italic",
  },
});
