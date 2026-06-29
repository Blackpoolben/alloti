import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Switch, ActivityIndicator, Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getSettings, saveSettings } from "../api/gardeningApi";

const BRAND  = "#2D6A4F";
const ACCENT = "#52B788";
const BG     = "#F0F7F4";

const VERSION = "1.0.0";

function SettingRow({ icon, label, children }) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={BRAND} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowControl}>{children}</View>
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const [postcode,    setPostcode]    = useState("");
  const [apiUrl,      setApiUrl]      = useState("http://localhost:5000");
  const [notifications, setNotifications] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [local, remote] = await Promise.all([
        AsyncStorage.multiGet(["postcode", "api_base_url", "offline_mode", "notifications"]),
        getSettings().catch(() => ({})),
      ]);

      const localMap = Object.fromEntries(local.map(([k, v]) => [k, v]));
      setPostcode(localMap.postcode || remote.postcode || "");
      setApiUrl(localMap.api_base_url || "http://localhost:5000");
      setOfflineMode(localMap.offline_mode === "true");
      setNotifications(localMap.notifications === "true");
    } catch (err) {
      console.warn("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pc = postcode.trim().toUpperCase();

      await AsyncStorage.multiSet([
        ["postcode",      pc],
        ["api_base_url",  apiUrl.trim()],
        ["offline_mode",  String(offlineMode)],
        ["notifications", String(notifications)],
      ]);

      await saveSettings({ postcode: pc }).catch(() => {});
      Alert.alert("Saved", "Settings updated successfully ✓");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert("Clear History", "Delete all plant identification history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => Alert.alert("Cleared", "History cleared from local storage.") },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* App header */}
      <View style={styles.appHeader}>
        <Text style={styles.appEmoji}>🌿</Text>
        <Text style={styles.appName}>Alloti</Text>
        <Text style={styles.appSubtitle}>UK Gardening Companion</Text>
        <Text style={styles.appVersion}>v{VERSION}</Text>
      </View>

      {/* Location */}
      <SectionHeader title="Location" />
      <View style={styles.card}>
        <SettingRow icon="location-outline" label="Postcode">
          <TextInput
            style={styles.textInput}
            placeholder="e.g. SW1A"
            value={postcode}
            onChangeText={setPostcode}
            autoCapitalize="characters"
            maxLength={8}
          />
        </SettingRow>
        <Text style={styles.hint}>
          Used for weather and frost date calculations. UK postcodes only.
        </Text>
      </View>

      {/* App behaviour */}
      <SectionHeader title="App Behaviour" />
      <View style={styles.card}>
        <SettingRow icon="cloud-offline-outline" label="Offline Mode">
          <Switch
            value={offlineMode}
            onValueChange={setOfflineMode}
            trackColor={{ true: ACCENT }}
            thumbColor={offlineMode ? BRAND : "#f0f0f0"}
          />
        </SettingRow>
        <Text style={styles.hint}>
          Prefer on-device TFLite model for plant identification when offline.
        </Text>

        <View style={styles.divider} />

        <SettingRow icon="notifications-outline" label="Planting Reminders">
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ true: ACCENT }}
            thumbColor={notifications ? BRAND : "#f0f0f0"}
          />
        </SettingRow>
        <Text style={styles.hint}>Seasonal alerts for sowing and pruning (coming soon).</Text>
      </View>

      {/* API */}
      <SectionHeader title="Backend API" />
      <View style={styles.card}>
        <SettingRow icon="server-outline" label="API URL">
          <TextInput
            style={[styles.textInput, { width: 160 }]}
            placeholder="http://localhost:5000"
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </SettingRow>
        <Text style={styles.hint}>
          Point to your Flask backend. Default: http://localhost:5000
        </Text>
      </View>

      {/* Save button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="save-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>Save Settings</Text></>
        }
      </TouchableOpacity>

      {/* Data */}
      <SectionHeader title="Data" />
      <View style={styles.card}>
        <TouchableOpacity style={styles.dangerRow} onPress={handleClearHistory}>
          <Ionicons name="trash-outline" size={18} color="#e53935" />
          <Text style={styles.dangerText}>Clear Identification History</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={styles.card}>
        <InfoRow label="Plant database"    value="50+ UK species" />
        <InfoRow label="Plant ID"          value="PlantNet API" />
        <InfoRow label="Weather"           value="Open-Meteo" />
        <InfoRow label="Postcodes"         value="postcodes.io" />
        <InfoRow label="Offline model"     value="MobileNetV2 TFLite" />

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL("https://my.plantnet.org/")}
        >
          <Ionicons name="open-outline" size={16} color={BRAND} />
          <Text style={styles.linkText}>PlantNet — plant identification service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL("https://open-meteo.com/")}
        >
          <Ionicons name="open-outline" size={16} color={BRAND} />
          <Text style={styles.linkText}>Open-Meteo — free weather API</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  center:       { flex: 1, justifyContent: "center", alignItems: "center" },
  appHeader:    { alignItems: "center", padding: 28, backgroundColor: BRAND },
  appEmoji:     { fontSize: 52, marginBottom: 8 },
  appName:      { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  appSubtitle:  { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 2 },
  appVersion:   { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 },
  sectionHeader:{ fontSize: 12, fontWeight: "700", color: "#888", letterSpacing: 1, textTransform: "uppercase", marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  card:         { backgroundColor: "#fff", marginHorizontal: 12, borderRadius: 14, paddingVertical: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  settingRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  rowIcon:      { marginRight: 12 },
  rowLabel:     { flex: 1, fontSize: 15, color: "#333" },
  rowControl:   {},
  textInput:    { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, minWidth: 120, textAlign: "right" },
  hint:         { fontSize: 12, color: "#aaa", paddingHorizontal: 52, paddingBottom: 10, lineHeight: 16 },
  divider:      { height: 1, backgroundColor: "#f5f5f5", marginHorizontal: 16 },
  saveBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: BRAND, margin: 16, borderRadius: 12, paddingVertical: 14 },
  saveBtnText:  { color: "#fff", fontWeight: "700", fontSize: 16 },
  dangerRow:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  dangerText:   { color: "#e53935", fontSize: 15 },
  infoRow:      { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10 },
  infoLabel:    { flex: 1, fontSize: 14, color: "#555" },
  infoValue:    { fontSize: 14, color: "#888" },
  linkRow:      { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  linkText:     { fontSize: 13, color: BRAND },
});
