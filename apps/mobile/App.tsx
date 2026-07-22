import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RootNavigator } from "./src/navigation/RootNavigator.js";
import { useAuthStore } from "./src/stores/useAuthStore.js";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  // Restore any stored session on launch.
  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
