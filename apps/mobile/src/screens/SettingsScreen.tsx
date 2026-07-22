import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { useAuthStore } from "../stores/useAuthStore.js";

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  type: "toggle" | "link" | "info";
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
}

/**
 * Settings screen for app configuration and user preferences.
 */
export function SettingsScreen() {
  const { user, signOut, isAuthenticated } = useAuthStore();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    autoArchive: false,
    showUnreadOnly: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to sign in again to access your emails.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => signOut(),
        },
      ]
    );
  };

  const settingItems: SettingItem[] = [
    {
      id: "notifications",
      title: "Push Notifications",
      description: "Receive notifications for new emails",
      type: "toggle",
      value: settings.notifications,
      onValueChange: () => handleToggle("notifications"),
    },
    {
      id: "sound",
      title: "Notification Sound",
      description: "Play sound for notifications",
      type: "toggle",
      value: settings.soundEnabled,
      onValueChange: () => handleToggle("soundEnabled"),
    },
    {
      id: "autoArchive",
      title: "Auto-Archive Promotions",
      description: "Automatically archive promotional emails",
      type: "toggle",
      value: settings.autoArchive,
      onValueChange: () => handleToggle("autoArchive"),
    },
    {
      id: "unreadOnly",
      title: "Show Unread Only",
      description: "Only show unread emails in swipe deck",
      type: "toggle",
      value: settings.showUnreadOnly,
      onValueChange: () => handleToggle("showUnreadOnly"),
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      type: "link",
      onPress: () => Linking.openURL("https://example.com/privacy"),
    },
    {
      id: "terms",
      title: "Terms of Service",
      type: "link",
      onPress: () => Linking.openURL("https://example.com/terms"),
    },
    {
      id: "about",
      title: "About",
      description: "Mail Tracker v0.1.0",
      type: "info",
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* User Profile */}
      {isAuthenticated && user && (
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.email.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name || "User"}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsCard}>
          {settingItems
            .filter((item) => item.id === "notifications" || item.id === "sound")
            .map((item, index, arr) => (
              <View
                key={item.id}
                style={[
                  styles.settingRow,
                  index < arr.length - 1 && styles.settingRowBorder,
                ]}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.settingDescription}>{item.description}</Text>
                  )}
                </View>
                {item.type === "toggle" && item.onValueChange !== undefined && (
                  <Switch
                    value={item.value}
                    onValueChange={() => item.onValueChange!(true)}
                    trackColor={{ false: "#2A3F68", true: "#4285F4" }}
                    thumbColor="#E8EEF7"
                  />
                )}
              </View>
            ))}
        </View>
      </View>

      {/* Email Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <View style={styles.settingsCard}>
          {settingItems
            .filter((item) => item.id === "autoArchive" || item.id === "unreadOnly")
            .map((item, index, arr) => (
              <View
                key={item.id}
                style={[
                  styles.settingRow,
                  index < arr.length - 1 && styles.settingRowBorder,
                ]}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.settingDescription}>{item.description}</Text>
                  )}
                </View>
                {item.type === "toggle" && item.onValueChange !== undefined && (
                  <Switch
                    value={item.value}
                    onValueChange={() => item.onValueChange!(true)}
                    trackColor={{ false: "#2A3F68", true: "#4285F4" }}
                    thumbColor="#E8EEF7"
                  />
                )}
              </View>
            ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingsCard}>
          {settingItems
            .filter((item) => item.id === "privacy" || item.id === "terms" || item.id === "about")
            .map((item, index, arr) => {
              const rowStyle = [
                styles.settingRow,
                index < arr.length - 1 && styles.settingRowBorder,
              ];
              const rowContent = (
                <>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    )}
                  </View>
                  {item.type === "link" && <Text style={styles.linkArrow}>→</Text>}
                </>
              );
              // Clickable rows use TouchableOpacity; a plain View cannot handle onPress.
              return item.onPress ? (
                <TouchableOpacity key={item.id} style={rowStyle} onPress={item.onPress} activeOpacity={0.7}>
                  {rowContent}
                </TouchableOpacity>
              ) : (
                <View key={item.id} style={rowStyle}>
                  {rowContent}
                </View>
              );
            })}
        </View>
      </View>

      {/* Sign Out */}
      {isAuthenticated && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ for inbox zero enthusiasts</Text>
        <Text style={styles.footerText}>v0.1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: "#E8EEF7",
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#9AA7B8",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2748",
    borderRadius: 12,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2A3F68",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#E8EEF7",
    fontSize: 24,
    fontWeight: "600",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#E8EEF7",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileEmail: {
    color: "#9AA7B8",
    fontSize: 14,
  },
  settingsCard: {
    backgroundColor: "#1A2748",
    borderRadius: 12,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#2A3F68",
  },
  clickableRow: {
    // Additional padding for clickable rows
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: "#E8EEF7",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    color: "#9AA7B8",
    fontSize: 13,
  },
  linkArrow: {
    color: "#9AA7B8",
    fontSize: 18,
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: "#EA4335",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 40,
    alignItems: "center",
  },
  footerText: {
    color: "#4A5568",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
});