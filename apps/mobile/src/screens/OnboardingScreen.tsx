import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useAuthStore } from "../stores/useAuthStore.js";

export function OnboardingScreen() {
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const handleSignIn = async () => {
    clearError();
    await signIn();
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Logo / Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>📧</Text>
          </View>
          <Text style={styles.title}>Mail Tracker</Text>
          <Text style={styles.subtitle}>
            Take control of your inbox with AI-powered email management
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="🧹"
            title="Smart Cleanup"
            description="Automatically categorize and clean up your inbox"
          />
          <FeatureItem
            icon="👆"
            title="Swipe to Action"
            description="Archive, trash, or star emails with simple swipes"
          />
          <FeatureItem
            icon="📊"
            title="Insights"
            description="Get weekly insights about your email habits"
          />
          <FeatureItem
            icon="🔒"
            title="Private & Secure"
            description="Your data stays on your device"
          />
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.signInButtonText}>Sign in with Gmail</Text>
              <Text style={styles.signInButtonSubtext}>
                By continuing, you agree to our Terms of Service
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Footer */}
        <Text style={styles.footer}>Made with ❤️ for inbox zero enthusiasts</Text>
      </View>
    </ScrollView>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: "100%",
  },
  loadingText: {
    color: "#9AA7B8",
    marginTop: 16,
    fontSize: 16,
  },
  hero: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A2748",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    color: "#E8EEF7",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9AA7B8",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  features: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#1A2748",
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: "#E8EEF7",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureDescription: {
    color: "#9AA7B8",
    fontSize: 13,
    lineHeight: 18,
  },
  signInButton: {
    backgroundColor: "#4285F4",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  signInButtonSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  errorText: {
    color: "#F2A6A6",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
  footer: {
    color: "#4A5568",
    fontSize: 12,
    textAlign: "center",
    marginTop: 32,
  },
});