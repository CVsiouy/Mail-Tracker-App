import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import type { SwipeDecision } from "../services/interfaces.js";
import { useInboxStore } from "../stores/useInboxStore.js";
import { EmailCard } from "../components/EmailCard.js";

const { width, height } = Dimensions.get("window");
const CARD_HEIGHT = 260;
const SWIPE_THRESHOLD = width * 0.3;
const ANIMATION_DURATION = 300;

type SwipeDirection = "left" | "right" | "up" | "down" | null;

const DECISION_MAP: Record<Exclude<SwipeDirection, null>, SwipeDecision> = {
  left: "archive",
  right: "keep",
  up: "star",
  down: "trash",
};

/**
 * Swipe screen with 4-direction card swiping.
 * - Left: Archive   - Right: Keep   - Up: Star   - Down: Trash
 *
 * The deck is always driven off the FRONT of the `emails` array (index 0). The
 * store removes the swiped email, so the next email naturally becomes the top
 * card — there is no separate index to advance (the previous version kept both
 * and skipped emails).
 */
export function SwipeScreen() {
  const { emails, isLoading, isRefreshing, loadEmails, swipeEmail, undoSwipe, swipeHistory } =
    useInboxStore();

  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({
    inputRange: [-width, width],
    outputRange: ["-15deg", "15deg"],
  });

  useEffect(() => {
    loadEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    { useNativeDriver: false },
  );

  const completeSwipe = (direction: Exclude<SwipeDirection, null>) => {
    if (emails.length === 0 || isAnimating) return;
    setIsAnimating(true);
    setSwipeDirection(direction);

    const toValue = {
      left: { x: -width * 1.5, y: 0 },
      right: { x: width * 1.5, y: 0 },
      up: { x: 0, y: -height * 1.5 },
      down: { x: 0, y: height * 1.5 },
    }[direction];

    Animated.timing(pan, {
      toValue,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(async () => {
      // Always swipe the top card (index 0).
      await swipeEmail(0, DECISION_MAP[direction]);
      pan.setValue({ x: 0, y: 0 });
      setSwipeDirection(null);
      setIsAnimating(false);
    });
  };

  const onRelease = (gs: { translationX: number; translationY: number }) => {
    const { translationX: dx, translationY: dy } = gs;
    const snapBack = () =>
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > SWIPE_THRESHOLD) completeSwipe(dx > 0 ? "right" : "left");
      else snapBack();
    } else {
      if (Math.abs(dy) > SWIPE_THRESHOLD) completeSwipe(dy < 0 ? "up" : "down");
      else snapBack();
    }
  };

  const renderOverlay = () => {
    if (!swipeDirection || emails.length === 0) return null;
    const overlays = {
      left: { icon: "📁", label: "Archive", color: "#FBBC05" },
      right: { icon: "✅", label: "Keep", color: "#34A853" },
      up: { icon: "⭐", label: "Star", color: "#FBBC05" },
      down: { icon: "🗑️", label: "Trash", color: "#EA4335" },
    };
    const o = overlays[swipeDirection];
    return (
      <View style={styles.swipeOverlay}>
        <Text style={[styles.swipeOverlayIcon, { color: o.color }]}>{o.icon}</Text>
        <Text style={[styles.swipeOverlayLabel, { color: o.color }]}>{o.label}</Text>
      </View>
    );
  };

  if (isLoading && emails.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading your inbox…</Text>
      </View>
    );
  }

  if (emails.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>Inbox Zero!</Text>
        <Text style={styles.emptySubtitle}>You&apos;re all caught up. Pull to refresh.</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => loadEmails(true)}>
          <Text style={styles.refreshButtonText}>Refresh Inbox</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render the top 3 cards; index 0 is interactive.
  const deck = emails.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={styles.headerActions}>
          {swipeHistory.length > 0 && (
            <TouchableOpacity onPress={() => undoSwipe()} style={styles.undoButton}>
              <Text style={styles.undoButtonText}>↩ Undo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => loadEmails(true)}>
            <Text style={styles.syncButton}>Sync</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardStack}>
        {deck
          .map((email, index) => {
            const isTop = index === 0;
            const offset = index;
            const behindStyle = {
              transform: [{ scale: 1 - offset * 0.04 }, { translateY: offset * 12 }],
              opacity: 1 - offset * 0.25,
            };
            const topStyle = {
              transform: [...pan.getTranslateTransform(), { rotate }],
            };
            return (
              <Animated.View
                key={email.messageId}
                style={[styles.cardWrapper, isTop ? topStyle : behindStyle]}
                pointerEvents={isTop ? "auto" : "none"}
              >
                {isTop ? (
                  <PanGestureHandler
                    onGestureEvent={handleGestureEvent}
                    onHandlerStateChange={({ nativeEvent }) => {
                      if (nativeEvent.oldState === State.ACTIVE) onRelease(nativeEvent);
                    }}
                  >
                    <Animated.View>
                      <EmailCard email={email} isTopCard />
                    </Animated.View>
                  </PanGestureHandler>
                ) : (
                  <EmailCard email={email} isTopCard={false} />
                )}
              </Animated.View>
            );
          })
          // Render back-to-front so the top card sits on top.
          .reverse()}

        {renderOverlay()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.counter}>
          {emails.length} email{emails.length !== 1 ? "s" : ""} remaining
        </Text>
      </View>

      {isRefreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#4285F4" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", paddingTop: 10 },
  centerContainer: {
    flex: 1,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { color: "#9AA7B8", marginTop: 16, fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: { color: "#E8EEF7", fontSize: 24, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  undoButton: {},
  undoButtonText: { color: "#9AA7B8", fontSize: 15, fontWeight: "600" },
  syncButton: { color: "#4285F4", fontSize: 16, fontWeight: "600" },
  cardStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: CARD_HEIGHT + 40,
  },
  cardWrapper: { position: "absolute" },
  swipeOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(26, 39, 72, 0.9)",
    borderWidth: 3,
    borderColor: "#E8EEF7",
  },
  swipeOverlayIcon: { fontSize: 40 },
  swipeOverlayLabel: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  footer: { padding: 20, alignItems: "center" },
  counter: { color: "#9AA7B8", fontSize: 14 },
  refreshIndicator: { position: "absolute", top: 10, right: 20 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: "#E8EEF7", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { color: "#9AA7B8", fontSize: 16, textAlign: "center", marginBottom: 24 },
  refreshButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
