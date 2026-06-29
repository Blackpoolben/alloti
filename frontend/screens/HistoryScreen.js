import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getHistory, deleteHistoryEntry } from "../api/gardeningApi";

const BRAND  = "#2D6A4F";
const ACCENT = "#52B788";
const BG     = "#F0F7F4";

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ConfidenceBar({ value }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const colour = pct >= 70 ? ACCENT : pct >= 40 ? "#fb8c00" : "#ef5350";
  return (
    <View style={styles.confRow}>
      <View style={styles.confTrack}>
        <View style={[styles.confFill, { width: `${pct}%`, backgroundColor: colour }]} />
      </View>
      <Text style={[styles.confLabel, { color: colour }]}>{pct}%</Text>
    </View>
  );
}

export default function HistoryScreen({ navigation }) {
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const data = await getHistory(100);
      setHistory(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Delete", `Remove "${name}" from history?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteHistoryEntry(id);
            setHistory(h => h.filter(e => e.id !== id));
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleViewDetail = (item) => {
    // Try to navigate to plant detail using the common name as a query
    navigation.navigate("PlantDetail", { plantId: item.common_name?.toLowerCase().replace(/\s+/g, "_") });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  }

  if (history.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No identifications yet</Text>
        <Text style={styles.emptyText}>Use the Camera tab to identify plants in your garden</Text>
        <TouchableOpacity
          style={styles.goBtn}
          onPress={() => navigation.navigate("Camera")}
        >
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={styles.goBtnText}>Open Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={history}
      keyExtractor={item => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} tintColor={ACCENT} />
      }
      contentContainerStyle={{ padding: 12 }}
      ListHeaderComponent={
        <Text style={styles.listHeader}>{history.length} identification{history.length !== 1 ? "s" : ""}</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleViewDetail(item)} activeOpacity={0.8}>
          <View style={styles.cardLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf" size={22} color={BRAND} />
            </View>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardName}>{item.common_name}</Text>
            <Text style={styles.cardSpecies} numberOfLines={1}>{item.species}</Text>
            <ConfidenceBar value={item.confidence} />
            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.common_name)}
          >
            <Ionicons name="trash-outline" size={18} color="#e57373" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  center:       { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState:   { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, backgroundColor: BG },
  emptyEmoji:   { fontSize: 64, marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: "700", color: BRAND, marginBottom: 8 },
  emptyText:    { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 24 },
  goBtn:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  goBtnText:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  listHeader:   { fontSize: 13, color: "#888", marginBottom: 8, marginLeft: 4 },
  card:         { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLeft:     { marginRight: 14 },
  iconCircle:   { width: 44, height: 44, borderRadius: 22, backgroundColor: BG, justifyContent: "center", alignItems: "center" },
  cardBody:     { flex: 1 },
  cardName:     { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 2 },
  cardSpecies:  { fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 6 },
  confRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  confTrack:    { flex: 1, height: 6, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  confFill:     { height: "100%", borderRadius: 3 },
  confLabel:    { fontSize: 11, fontWeight: "700", width: 36, textAlign: "right" },
  cardDate:     { fontSize: 11, color: "#bbb" },
  deleteBtn:    { padding: 8 },
});
