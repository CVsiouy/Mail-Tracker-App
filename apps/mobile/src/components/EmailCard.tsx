import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { EmailMeta } from "../services/interfaces.js";

interface EmailCardProps {
  email: EmailMeta;
  onPress?: () => void;
  isTopCard?: boolean;
}

/**
 * Email card component for displaying email summary in the swipe deck.
 * Shows sender, subject, snippet, category pill, and attachment indicator.
 */
export function EmailCard({ email, onPress, isTopCard = false }: EmailCardProps) {
  const categoryColor = getCategoryColor(email.category);
  const formattedDate = formatRelativeDate(email.receivedAtMs);

  return (
    <TouchableOpacity
      style={[styles.card, !isTopCard && styles.cardBehind]}
      onPress={onPress}
      disabled={!isTopCard}
      activeOpacity={0.9}
    >
      {/* Category indicator bar */}
      <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

      {/* Card content */}
      <View style={styles.content}>
        {/* Header: sender + date */}
        <View style={styles.header}>
          <View style={styles.senderRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {email.from.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.sender} numberOfLines={1}>
              {email.from}
            </Text>
          </View>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* Subject */}
        <Text style={styles.subject} numberOfLines={2}>
          {email.subject || "(No subject)"}
        </Text>

        {/* Snippet */}
        <Text style={styles.snippet} numberOfLines={3}>
          {email.snippet}
        </Text>

        {/* Footer: category + attachment */}
        <View style={styles.footer}>
          <View style={[styles.categoryPill, { backgroundColor: categoryColor + "20" }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {email.category}
            </Text>
          </View>
          {email.hasAttachment && (
            <Text style={styles.attachmentIcon}>📎</Text>
          )}
          {email.isUnread && (
            <View style={styles.unreadDot} />
          )}
        </View>
      </View>
    </TouchableOpacity>
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

function formatRelativeDate(timestampMs: number): string {
  const now = Date.now();
  const diff = now - timestampMs;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    const date = new Date(timestampMs);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "Just now";
  }
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: "92%",
    maxHeight: 280,
    backgroundColor: "#1A2748",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  cardBehind: {
    transform: [{ scale: 0.95 }, { translateY: 15 }],
    opacity: 0.7,
  },
  categoryBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A3F68",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#E8EEF7",
    fontSize: 16,
    fontWeight: "600",
  },
  sender: {
    color: "#E8EEF7",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  date: {
    color: "#9AA7B8",
    fontSize: 12,
    marginLeft: 8,
  },
  subject: {
    color: "#E8EEF7",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  snippet: {
    color: "#9AA7B8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "auto",
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  attachmentIcon: {
    fontSize: 14,
    marginLeft: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4285F4",
    marginLeft: 12,
  },
});