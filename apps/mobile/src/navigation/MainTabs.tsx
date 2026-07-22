import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SwipeScreen } from "../screens/SwipeScreen.js";
import { CategoriesScreen } from "../screens/CategoriesScreen.js";
import { InsightsScreen } from "../screens/InsightsScreen.js";
import { SettingsScreen } from "../screens/SettingsScreen.js";

const Tab = createBottomTabNavigator();

/** Emoji tab icon (keeps the app dependency-light — no icon font needed). */
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#4285F4",
        tabBarInactiveTintColor: "#9AA7B8",
        tabBarStyle: {
          backgroundColor: "#1A2748",
          borderTopColor: "#2A3F68",
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12 },
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#E8EEF7",
        headerTitleStyle: { fontWeight: "600" },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Swipe"
        component={SwipeScreen}
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => <TabIcon emoji="📥" color={color} />,
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: "Categories",
          tabBarIcon: ({ color }) => <TabIcon emoji="🗂️" color={color} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          title: "Insights",
          tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
