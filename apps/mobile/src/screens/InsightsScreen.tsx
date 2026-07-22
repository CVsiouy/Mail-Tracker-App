import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useInboxStore } from "../stores/useInboxStore.js";
import { mailTrackerApi } from "../services/api/mailTrackerApi.js";
import type { InsightsResponse } from "@mailtracker/shared";

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Insights screen showing email analytics and AI-generated insights.
 */
export function InsightsScreen() {
  const { emails, isLoading } = useInboxStore();
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (emails.length > 0) {
      calculateCategoryStats();
    }
  }, [emails]);

  const calculateCategoryStats = () => {
    const categoryMap = new Map<string, number>();
    emails.forEach((email) => {
      const cat = email.category || "General";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const total = emails.length;
    const stats: CategoryStats[] = [];
    categoryMap.forEach((count, name) => {
      stats.push({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        color: getCategoryColor(name),
      });
    });

    stats.sort((a, b) => b.count - a.count);
    setCategoryStats(stats);
  };

  const generateInsights = async () => {
    if (emails.length === 0) return;
    setIsGenerating(true);
    try {
      // The server aggregates the user's inbox and returns the summary — the
      // client no longer sends email data.
      const result = await mailTrackerApi.getInsights();
      setInsights(result);
    } catch (error) {
      console.error("Failed to generate insights:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const unreadCount = emails.filter((e) => e.isUnread).length;
  const attachmentCount = emails.filter((e) => e.hasAttachment).length;

  if (isLoading && emails.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Emails"
            value={emails.length.toString()}
            color="#4285F4"
          />
          <StatCard
            label="Unread"
            value={unreadCount.toString()}
            color="#EA4335"
          />
          <StatCard
            label="With Attachments"
            value={attachmentCount.toString()}
            color="#FBBC05"
          />
          <StatCard
            label="Categories"
            value={categoryStats.length.toString()}
            color="#34A853"
          />
        </View>
      </View>

      {/* Category Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Distribution</Text>
        <View style={styles.categoryList}>
          {categoryStats.map((cat) => (
            <View key={cat.name} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryColorBar, { backgroundColor: cat.color }]} />
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryCount}>{cat.count}</Text>
                <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <TouchableOpacity onPress={generateInsights} disabled={isGenerating}>
            <Text style={styles.generateButton}>
              {isGenerating ? "Generating..." : "Generate"}
            </Text>
          </TouchableOpacity>
        </View>

        {insights ? (
          <View style={styles.insightsCard}>
            <Text style={styles.insightsSummary}>{insights.summary}</Text>
            {insights.highlights.length > 0 && (
              <View style={styles.highlights}>
                <Text style={styles.highlightsTitle}>Highlights:</Text>
                {insights.highlights.map((highlight, index) => (
                  <Text key={index} style={styles.highlightItem}>• {highlight}</Text>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.insightsPlaceholder}>
            <Text style={styles.insightsPlaceholderText}>
              Tap "Generate" to get AI-powered insights about your email patterns.
            </Text>
          </View>
        )}
      </View>

      {/* Top Senders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Senders</Text>
        <View style={styles.topSendersList}>
          {getTopSenders().map((sender, index) => (
            <View key={index} style={styles.senderRow}>
              <View style={styles.senderRank}>
                <Text style={styles.senderRankText}>{index + 1}</Text>
              </View>
              <Text style={styles.senderName} numberOfLines={1}>{sender.name}</Text>
              <Text style={styles.senderCount}>{sender.count} emails</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  function getTopSenders() {
    const senderMap = new Map<string, number>();
    emails.forEach((email) => {
      senderMap.set(email.from, (senderMap.get(email.from) || 0) + 1);
    });

    const senders = Array.from(senderMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return senders;
  }
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Work: "#4285F4",
    Personal: "#34A853",
    Promotions: "#FBBC05",
    Social: "#EA4335",
    Updates: "#9C27B0",
    Forums: "#FF9800",
    Important: "#F44336",
    Finance: "#00BCD4",
    Security: "#795548",
    General: "#9E9E9E",
    Uncategorized: "#9E9E9E",
  };
  return colors[category] || colors.General;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#9AA7B8",
    marginTop: 16,
    fontSize: 16,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#E8EEF7",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#1A2748",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  statValue: {
    color: "#E8EEF7",
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    color: "#9AA7B8",
    fontSize: 13,
    marginTop: 4,
  },
  categoryList: {
    backgroundColor: "#1A2748",
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3F68",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryColorBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryName: {
    color: "#E8EEF7",
    fontSize: 15,
    fontWeight: "500",
  },
  categoryStats: {
    alignItems: "flex-end",
  },
  categoryCount: {
    color: "#E8EEF7",
    fontSize: 15,
    fontWeight: "600",
  },
  categoryPercentage: {
    color: "#9AA7B8",
    fontSize: 13,
  },
  generateButton: {
    color: "#4285F4",
    fontSize: 14,
    fontWeight: "600",
  },
  insightsCard: {
    backgroundColor: "#1A2748",
    borderRadius: 12,
    padding: 16,
  },
  insightsSummary: {
    color: "#E8EEF7",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  highlights: {
    borderTopWidth: 1,
    borderTopColor: "#2A3F68",
    paddingTop: 12,
  },
  highlightsTitle: {
    color: "#9AA7B8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  highlightItem: {
    color: "#E8EEF7",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  insightsPlaceholder: {
    backgroundColor: "#1A2748",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  insightsPlaceholderText: {
    color: "#9AA7B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  topSendersList: {
    backgroundColor: "#1A2748",
    borderRadius: 12,
    overflow: "hidden",
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A3F68",
  },
  senderRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2A3F68",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  senderRankText: {
    color: "#E8EEF7",
    fontSize: 13,
    fontWeight: "600",
  },
  senderName: {
    color: "#E8EEF7",
    fontSize: 14,
    flex: 1,
  },
  senderCount: {
    color: "#9AA7B8",
    fontSize: 13,
  },
});