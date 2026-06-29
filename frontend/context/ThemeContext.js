import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const LIGHT = {
  mode:         "light",
  brand:        "#2D6A4F",
  accent:       "#52B788",
  bg:           "#F0F7F4",
  card:         "#FFFFFF",
  text:         "#1A1A1A",
  textSecondary:"#666666",
  textMuted:    "#999999",
  border:       "#E5E5E5",
  inputBg:      "#FFFFFF",
  danger:       "#E53935",
  warning:      "#FB8C00",
  success:      "#43A047",
  info:         "#1E88E5",
  tabBar:       "#FFFFFF",
  header:       "#2D6A4F",
  shadow:       "#000000",
};

export const DARK = {
  mode:         "dark",
  brand:        "#52B788",
  accent:       "#74C69D",
  bg:           "#0D1B14",
  card:         "#1A2E22",
  text:         "#F0F7F4",
  textSecondary:"#A8C5B5",
  textMuted:    "#5A7A68",
  border:       "#2A4035",
  inputBg:      "#1A2E22",
  danger:       "#EF5350",
  warning:      "#FFA726",
  success:      "#66BB6A",
  info:         "#42A5F5",
  tabBar:       "#111F18",
  header:       "#111F18",
  shadow:       "#000000",
};

const ThemeContext = createContext({ theme: LIGHT, toggle: () => {}, isDark: false });

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [isDark, setIsDark] = useState(system === "dark");

  useEffect(() => {
    AsyncStorage.getItem("theme").then(val => {
      if (val === "dark")  setIsDark(true);
      if (val === "light") setIsDark(false);
    });
  }, []);

  const toggle = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, toggle, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
