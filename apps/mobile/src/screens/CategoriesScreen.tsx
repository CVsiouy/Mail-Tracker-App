import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useInboxStore } from "../stores/useInboxStore.js";

interface CategoryItem {
  name: string;
  color: string;
  count: number;
  unread: number;
}

/**
 * Categories screen showing email counts by category.
 * Tapping a category shows emails in that category.
 */
export function CategoriesScreen() {
  const { emails, isLoading } = useInboxStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    // Group emails by category
    const categoryMap = new Map<string, { count: number; unread: number }>();
    
    emails.forEach((email) => {
      const cat = email.category || "General";
      const existing = categoryMap.get(cat) || { count: 0, unread: 0 };
      existing.count++;
      if (email.isUnread) existing.unread++;
      categoryMap.set(cat, existing);
    });

    const categoryItems: CategoryItem[] = [];
    categoryMap.forEach((data, name) => {
      categoryItems.push({
        name,
        color: getCategoryColor(name),
        count: data.count,
        unread: data.unread,
      });
    });

    // Sort by count descending
    categoryItems.sort((a, b) => b.count - a.count);
    setCategories(categoryItems);
  }, [emails]);

  // Categorization now happens server-side in the background — no client call.

  const filteredEmails = selectedCategory
    ? emails.filter((e) => e.category === selectedCategory)
    : emails;

  if (isLoading && emails.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (selectedCategory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.selectedTitle}>{selectedCategory}</Text>
          <View style={{ width: 60 }} />
        </View>

        <FlatList
          data={filteredEmails}
          keyExtractor={(item) => item.messageId}
          renderItem={({ item }) => (
            <View style={styles.emailItem}>
              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category) }]} />
              <View style={styles.emailContent}>
                <Text style={styles.emailFrom} numberOfLines={1}>{item.from}</Text>
                <Text style={styles.emailSubject} numberOfLines={1}>{item.subject}</Text>
              </View>
              {item.isUnread && <View style={styles.unreadDot} />}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No emails in this category</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryRow}
            onPress={() => setSelectedCategory(item.name)}
          >
            <View style={[styles.categoryColorBar, { backgroundColor: item.color }]} />
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{item.name}</Text>
              {item.unread > 0 && (
                <Text style={styles.unreadCount}>{item.unread} unread</Text>
              )}
            </View>
            <Text style={styles.categoryCount}>{item.count}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No emails yet</Text>
          </View>
        }
      />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2748",
  },
  title: {
    color: "#E8EEF7",
    fontSize: 24,
    fontWeight: "700",
  },
  backButton: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "500",
  },
  selectedTitle: {
    color: "#E8EEF7",
    fontSize: 18,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2748",
  },
  categoryColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: "#E8EEF7",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  unreadCount: {
    color: "#4285F4",
    fontSize: 13,
  },
  categoryCount: {
    color: "#9AA7B8",
    fontSize: 16,
    fontWeight: "600",
  },
  emailItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2748",
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  emailContent: {
    flex: 1,
  },
  emailFrom: {
    color: "#E8EEF7",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  emailSubject: {
    color: "#9AA7B8",
    fontSize: 13,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4285F4",
    marginLeft: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9AA7B8",
    fontSize: 16,
  },
});