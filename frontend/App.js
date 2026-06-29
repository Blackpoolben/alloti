import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { warmUpModel } from "./services/OfflineIdentifier";

import HomeScreen       from "./screens/HomeScreen";
import CameraScreen     from "./screens/CameraScreen";
import GardenScreen     from "./screens/GardenScreen";
import HistoryScreen    from "./screens/HistoryScreen";
import SettingsScreen   from "./screens/SettingsScreen";
import PlantDetailScreen from "./screens/PlantDetailScreen";
import JournalScreen    from "./screens/JournalScreen";
import DiseaseScreen    from "./screens/DiseaseScreen";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home:     ["leaf",       "leaf-outline"],
  Identify: ["camera",     "camera-outline"],
  Garden:   ["flower",     "flower-outline"],
  Journal:  ["book",       "book-outline"],
  More:     ["menu",       "menu-outline"],
};

function GardenStack({ theme }) {
  return (
    <Stack.Navigator screenOptions={navOpts(theme)}>
      <Stack.Screen name="GardenList"   component={GardenScreen}      options={{ title: "My Garden" }} />
      <Stack.Screen name="PlantDetail"  component={PlantDetailScreen}  options={{ title: "Plant Info" }} />
    </Stack.Navigator>
  );
}

function MoreStack({ theme }) {
  return (
    <Stack.Navigator screenOptions={navOpts(theme)}>
      <Stack.Screen name="DiseaseHome"  component={DiseaseScreen}  options={{ title: "Disease Checker" }} />
      <Stack.Screen name="HistoryList"  component={HistoryScreen}  options={{ title: "ID History" }} />
      <Stack.Screen name="PlantDetail"  component={PlantDetailScreen} options={{ title: "Plant Info" }} />
      <Stack.Screen name="Settings"     component={SettingsScreen}  options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}

const navOpts = (theme) => ({
  headerStyle:     { backgroundColor: theme.header },
  headerTintColor: "#fff",
  headerTitleStyle:{ fontWeight: "700" },
});

function AppNavigator() {
  const { theme, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.bg,
      card:       theme.card,
      text:       theme.text,
      primary:    theme.brand,
      border:     theme.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? "light" : "light"} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle:           { backgroundColor: theme.header },
          headerTintColor:       "#fff",
          headerTitleStyle:      { fontWeight: "700" },
          tabBarActiveTintColor:  theme.accent,
          tabBarInactiveTintColor:"#888",
          tabBarStyle:           { backgroundColor: theme.tabBar, borderTopColor: theme.border },
          tabBarIcon: ({ focused, color, size }) => {
            const [active, inactive] = TAB_ICONS[route.name] || ["help", "help-outline"];
            return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home"     component={HomeScreen}    options={{ title: "Dashboard" }} />
        <Tab.Screen name="Identify" component={CameraScreen}  options={{ title: "Identify", headerShown: false }} />
        <Tab.Screen name="Garden"   component={() => <GardenStack theme={theme} />} options={{ headerShown: false }} />
        <Tab.Screen name="Journal"  component={JournalScreen} options={{ title: "Journal" }} />
        <Tab.Screen name="More"     component={() => <MoreStack theme={theme} />}   options={{ headerShown: false }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    warmUpModel();

    // Handle notification taps
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification tapped:", response.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
