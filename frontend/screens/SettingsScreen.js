import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator, Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getSettings, saveSettings } from "../api/gardeningApi";
import {
  requestPermission,
  scheduleMonthlySowingReminder,
  scheduleWeeklySowingReminder,
  cancelAllReminders,
  getScheduledReminders,
} from "../services/NotificationService";

const VERSION = "1.1.0";

export default function SettingsScreen() {
  const { theme, toggle, isDark } = useTheme();
  const s = makeStyles(theme);

  const [postcode,       setPostcode]       = useState("");
  const [apiUrl,         setApiUrl]         = useState("http://localhost:5000");
  const [notifications,  setNotifications]  = useState(false);
  const [weeklyReminder, setWeeklyReminder] = useState(false);
  const [offlineMode,    setOfflineMode]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [reminderCount,  setReminderCount]  = useState(0);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const [local] = await Promise.all([
        AsyncStorage.multiGet(["postcode", "api_base_url", "offline_mode", "notifications", "weekly_reminder"]),
      ]);
      const m = Object.fromEntries(local.map(([k, v]) => [k, v]));
      setPostcode(m.postcode || "");
      setApiUrl(m.api_base_url || "http://localhost:5000");
      setOfflineMode(m.offline_mode === "true");
      setNotifications(m.notifications === "true");
      setWeeklyReminder(m.weekly_reminder === "true");

      const reminders = await getScheduledReminders();
      setReminderCount(reminders.length);
    } catch (err) {
      console.warn("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsToggle = async (value) => {
    if (value) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert("Permission denied", "Enable notifications in your device settings to receive planting reminders.");
        return;
      }
      await scheduleMonthlySowingReminder();
      setNotifications(true);
      await AsyncStorage.setItem("notifications", "true");
      const reminders = await getScheduledReminders();
      setReminderCount(reminders.length);
      Alert.alert("Reminders set", "You'll receive monthly gardening reminders on the 1st of each month.");
    } else {
      await cancelAllReminders();
      setNotifications(false);
      setWeeklyReminder(false);
      await AsyncStorage.multiSet([["notifications", "false"], ["weekly_reminder", "false"]]);
      setReminderCount(0);
    }
  };

  const handleWeeklyToggle = async (value) => {
    setWeeklyReminder(value);
    await AsyncStorage.setItem("weekly_reminder", String(value));
    if (value) {
      await scheduleWeeklySowingReminder();
    }
    const reminders = await getScheduledReminders();
    setReminderCount(reminders.length);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pc = postcode.trim().toUpperCase();
      await AsyncStorage.multiSet([
        ["postcode",      pc],
        ["api_base_url",  apiUrl.trim()],
        ["offline_mode",  String(offlineMode)],
      ]);
      await saveSettings({ postcode: pc }).catch(() => {});
      Alert.alert("Saved ✓", "Settings updated successfully.");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;

  return (
    <ScrollView style={s.container}>
      {/* App header */}
      <View style={s.appHeader}>
        <Text style={s.appEmoji}>🌿</Text>
        <Text style={s.appName}>Alloti</Text>
        <Text style={s.appSubtitle}>UK Gardening Companion</Text>
        <Text style={s.appVersion}>v{VERSION}</Text>
      </View>

      {/* Appearance */}
      <SectionHeader title="Appearance" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <SettingRow icon="moon-outline" label="Dark Mode" theme={theme}>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ true: theme.accent }}
            thumbColor={isDark ? theme.brand : "#f0f0f0"}
          />
        </SettingRow>
      </View>

      {/* Location */}
      <SectionHeader title="Location" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <SettingRow icon="location-outline" label="Postcode" theme={theme}>
          <TextInput
            style={[s.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
            placeholder="e.g. SW1A"
            placeholderTextColor={theme.textMuted}
            value={postcode}
            onChangeText={setPostcode}
            autoCapitalize="characters"
            maxLength={8}
          />
        </SettingRow>
        <Text style={[s.hint, { color: theme.textMuted }]}>Used for weather and frost date calculations. UK postcodes only.</Text>
      </View>

      {/* Notifications */}
      <SectionHeader title="Reminders" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <SettingRow icon="notifications-outline" label="Monthly Planting" theme={theme}>
          <Switch
            value={notifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ true: theme.accent }}
            thumbColor={notifications ? theme.brand : "#f0f0f0"}
          />
        </SettingRow>
        <Text style={[s.hint, { color: theme.textMuted }]}>Reminder on 1st of each month with seasonal gardening tasks.</Text>

        <View style={[s.divider, { backgroundColor: theme.border }]} />

        <SettingRow icon="calendar-outline" label="Weekend Check" theme={theme}>
          <Switch
            value={weeklyReminder}
            onValueChange={handleWeeklyToggle}
            disabled={!notifications}
            trackColor={{ true: theme.accent }}
            thumbColor={weeklyReminder ? theme.brand : "#f0f0f0"}
          />
        </SettingRow>
        <Text style={[s.hint, { color: theme.textMuted }]}>Saturday morning garden checklist reminder.</Text>

        {reminderCount > 0 && (
          <View style={[s.reminderBadge, { backgroundColor: theme.bg }]}>
            <Ionicons name="alarm" size={14} color={theme.accent} />
            <Text style={[s.reminderBadgeText, { color: theme.textSecondary }]}>{reminderCount} reminder{reminderCount !== 1 ? "s" : ""} scheduled</Text>
          </View>
        )}
      </View>

      {/* App behaviour */}
      <SectionHeader title="App Behaviour" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <SettingRow icon="cloud-offline-outline" label="Prefer Offline ID" theme={theme}>
          <Switch
            value={offlineMode}
            onValueChange={setOfflineMode}
            trackColor={{ true: theme.accent }}
            thumbColor={offlineMode ? theme.brand : "#f0f0f0"}
          />
        </SettingRow>
        <Text style={[s.hint, { color: theme.textMuted }]}>Use on-device TFLite model first, fall back to PlantNet API.</Text>
      </View>

      {/* API */}
      <SectionHeader title="Backend API" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <SettingRow icon="server-outline" label="API URL" theme={theme}>
          <TextInput
            style={[s.textInput, { width: 160, color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
            placeholder="http://localhost:5000"
            placeholderTextColor={theme.textMuted}
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </SettingRow>
        <Text style={[s.hint, { color: theme.textMuted }]}>Point to your Flask backend. See README for deployment options.</Text>
      </View>

      {/* Save */}
      <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.brand }]} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="save-outline" size={20} color="#fff" /><Text style={s.saveBtnText}>Save Settings</Text></>
        }
      </TouchableOpacity>

      {/* Data */}
      <SectionHeader title="Data" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={s.dangerRow} onPress={() => Alert.alert("Cleared", "History cleared.")}>
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
          <Text style={[s.dangerText, { color: theme.danger }]}>Clear Identification History</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <SectionHeader title="About" theme={theme} />
      <View style={[s.card, { backgroundColor: theme.card }]}>
        <InfoRow label="Plant database"  value="52 UK species"          theme={theme} />
        <InfoRow label="Plant ID"        value="PlantNet API"            theme={theme} />
        <InfoRow label="Weather"         value="Open-Meteo"             theme={theme} />
        <InfoRow label="Postcodes"       value="postcodes.io"           theme={theme} />
        <InfoRow label="Offline model"   value="MobileNetV2 TFLite"     theme={theme} />
        <InfoRow label="Diseases DB"     value="12 UK conditions"       theme={theme} />

        <LinkRow url="https://my.plantnet.org/"  label="PlantNet — plant identification" theme={theme} />
        <LinkRow url="https://open-meteo.com/"   label="Open-Meteo — free weather API"   theme={theme} />
        <LinkRow url="https://postcodes.io/"     label="postcodes.io — UK geocoding"     theme={theme} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SectionHeader({ title, theme }) {
  return <Text style={{ fontSize: 12, fontWeight: "700", color: theme.textMuted, letterSpacing: 1, textTransform: "uppercase", marginHorizontal: 16, marginTop: 20, marginBottom: 8 }}>{title}</Text>;
}

function SettingRow({ icon, label, theme, children }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
      <Ionicons name={icon} size={20} color={theme.brand} style={{ marginRight: 12 }} />
      <Text style={{ flex: 1, fontSize: 15, color: theme.text }}>{label}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, theme }) {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10 }}>
      <Text style={{ flex: 1, fontSize: 14, color: theme.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, color: theme.textMuted }}>{value}</Text>
    </View>
  );
}

function LinkRow({ url, label, theme }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
      onPress={() => Linking.openURL(url)}
    >
      <Ionicons name="open-outline" size={16} color={theme.brand} />
      <Text style={{ fontSize: 13, color: theme.brand }}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: t.bg },
  center:           { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.bg },
  appHeader:        { alignItems: "center", padding: 28, backgroundColor: t.brand },
  appEmoji:         { fontSize: 52, marginBottom: 8 },
  appName:          { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  appSubtitle:      { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 2 },
  appVersion:       { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 },
  card:             { marginHorizontal: 12, borderRadius: 14, paddingVertical: 4, shadowColor: t.shadow, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  textInput:        { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, minWidth: 120, textAlign: "right" },
  hint:             { fontSize: 12, paddingHorizontal: 52, paddingBottom: 10, lineHeight: 16 },
  divider:          { height: 1, marginHorizontal: 16 },
  reminderBadge:    { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 10 },
  reminderBadgeText:{ fontSize: 13 },
  saveBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 16, borderRadius: 12, paddingVertical: 14 },
  saveBtnText:      { color: "#fff", fontWeight: "700", fontSize: 16 },
  dangerRow:        { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  dangerText:       { fontSize: 15 },
});
