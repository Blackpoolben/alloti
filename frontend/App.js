import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./screens/HomeScreen";
import CameraScreen from "./screens/CameraScreen";
import GardenScreen from "./screens/GardenScreen";
import HistoryScreen from "./screens/HistoryScreen";
import SettingsScreen from "./screens/SettingsScreen";
import PlantDetailScreen from "./screens/PlantDetailScreen";

const Tab  = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BRAND = "#2D6A4F";
const ACCENT = "#52B788";

function GardenStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: BRAND }, headerTintColor: "#fff" }}>
      <Stack.Screen name="GardenList"  component={GardenScreen}      options={{ title: "My Garden" }} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen}  options={{ title: "Plant Info" }} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: BRAND }, headerTintColor: "#fff" }}>
      <Stack.Screen name="HistoryList" component={HistoryScreen}      options={{ title: "ID History" }} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen}  options={{ title: "Plant Info" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle:      { backgroundColor: BRAND },
          headerTintColor:  "#fff",
          tabBarActiveTintColor:   ACCENT,
          tabBarInactiveTintColor: "#888",
          tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#e5e5e5" },
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Home:     focused ? "leaf"           : "leaf-outline",
              Camera:   focused ? "camera"         : "camera-outline",
              Garden:   focused ? "flower"         : "flower-outline",
              History:  focused ? "time"           : "time-outline",
              Settings: focused ? "settings"       : "settings-outline",
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home"     component={HomeScreen}    options={{ title: "Dashboard" }} />
        <Tab.Screen name="Camera"   component={CameraScreen}  options={{ title: "Identify", headerShown: false }} />
        <Tab.Screen name="Garden"   component={GardenStack}   options={{ headerShown: false }} />
        <Tab.Screen name="History"  component={HistoryStack}  options={{ headerShown: false }} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
