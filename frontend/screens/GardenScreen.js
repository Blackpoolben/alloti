import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, ActivityIndicator, Modal, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getGarden, removeFromGarden, updateGardenEntry, getPlants, addToGarden } from "../api/gardeningApi";

const BRAND  = "#2D6A4F";
const ACCENT = "#52B788";
const BG     = "#F0F7F4";

const CATEGORY_EMOJI = {
  vegetable: "🥦", fruit: "🍓", herb: "🌿", flower: "🌸",
  shrub: "🌳", climber: "🌿", perennial: "🌼", bulb: "🌷",
};

export default function GardenScreen({ navigation }) {
  const [garden,     setGarden]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [search,     setSearch]     = useState("");

  useFocusEffect(
    useCallback(() => {
      loadGarden();
    }, [])
  );

  const loadGarden = async () => {
    try {
      const data = await getGarden();
      setGarden(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove Plant", `Remove ${name} from your garden?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await removeFromGarden(id);
          setGarden(g => g.filter(e => e.id !== id));
        },
      },
    ]);
  };

  const handleViewDetail = (plantId) => {
    navigation.navigate("PlantDetail", { plantId });
  };

  const filtered = search
    ? garden.filter(e => e.common_name.toLowerCase().includes(search.toLowerCase()))
    : garden;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search my garden…"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>Your garden is empty</Text>
          <Text style={styles.emptyText}>Add plants to track your growing season</Text>
          <TouchableOpacity style={styles.addBtnLarge} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Plant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGarden(); }} tintColor={ACCENT} />}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <GardenCard
              item={item}
              onDelete={() => handleDelete(item.id, item.common_name)}
              onView={() => handleViewDetail(item.plant_id)}
            />
          )}
        />
      )}

      {/* FAB */}
      {filtered.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <AddPlantModal visible={showAdd} onClose={() => setShowAdd(false)} onAdded={loadGarden} />
    </View>
  );
}

function GardenCard({ item, onDelete, onView }) {
  const plantedStr = item.planted_at
    ? new Date(item.planted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={onView}>
        <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[item.category] || "🌿"}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.common_name}</Text>
          {plantedStr && <Text style={styles.cardMeta}>Planted: {plantedStr}</Text>}
          {item.location && <Text style={styles.cardMeta}>📍 {item.location}</Text>}
          {item.notes && <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>}
          {item.quantity > 1 && <Text style={styles.cardMeta}>× {item.quantity}</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color="#e53935" />
      </TouchableOpacity>
    </View>
  );
}

function AddPlantModal({ visible, onClose, onAdded }) {
  const [allPlants, setAllPlants] = useState([]);
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [notes,     setNotes]     = useState("");
  const [location,  setLocation]  = useState("");
  const [selected,  setSelected]  = useState(null);
  const [adding,    setAdding]    = useState(false);

  const loadPlants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlants();
      setAllPlants(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(loadPlants);

  const filtered = search
    ? allPlants.filter(p => p.common_name.toLowerCase().includes(search.toLowerCase()))
    : allPlants;

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await addToGarden({
        plant_id:   selected.id,
        notes,
        location,
        planted_at: new Date().toISOString().split("T")[0],
      });
      onAdded();
      onClose();
      setSelected(null);
      setNotes("");
      setLocation("");
      setSearch("");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Plant to Garden</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {!selected ? (
          <>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search plants…"
              value={search}
              onChangeText={setSearch}
            />
            {loading
              ? <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
              : (
                <FlatList
                  data={filtered.slice(0, 50)}
                  keyExtractor={p => p.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.plantRow} onPress={() => setSelected(item)}>
                      <Text style={styles.plantRowEmoji}>{item.emoji}</Text>
                      <View>
                        <Text style={styles.plantRowName}>{item.common_name}</Text>
                        <Text style={styles.plantRowCat}>{item.category} · {item.difficulty}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )
            }
          </>
        ) : (
          <View style={{ flex: 1, padding: 16 }}>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedEmoji}>{selected.emoji}</Text>
              <Text style={styles.selectedName}>{selected.common_name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Location (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. raised bed 2, greenhouse"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { height: 80, textAlignVertical: "top" }]}
              placeholder="Any growing notes…"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd} disabled={adding}>
              {adding
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={styles.confirmBtnText}>Add to Garden</Text></>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BG },
  center:         { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar:      { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchInput:    { flex: 1, fontSize: 14, color: "#333" },
  card:           { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, marginBottom: 10, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardContent:    { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardEmoji:      { fontSize: 32 },
  cardInfo:       { flex: 1 },
  cardName:       { fontSize: 16, fontWeight: "700", color: "#222", marginBottom: 2 },
  cardMeta:       { fontSize: 12, color: "#888", marginTop: 2 },
  cardNotes:      { fontSize: 12, color: "#666", marginTop: 4, fontStyle: "italic" },
  deleteBtn:      { padding: 8 },
  emptyState:     { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyEmoji:     { fontSize: 64, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: "700", color: BRAND, marginBottom: 8 },
  emptyText:      { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 24 },
  addBtnLarge:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  addBtnText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
  fab:            { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: BRAND, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  modal:          { flex: 1, backgroundColor: "#fff" },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  modalTitle:     { fontSize: 18, fontWeight: "700", color: "#222" },
  modalSearch:    { margin: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  plantRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f5f5f5" },
  plantRowEmoji:  { fontSize: 28 },
  plantRowName:   { fontSize: 15, fontWeight: "600", color: "#222" },
  plantRowCat:    { fontSize: 12, color: "#888", marginTop: 2, textTransform: "capitalize" },
  selectedBadge:  { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: BG, borderRadius: 12, padding: 14, marginBottom: 20 },
  selectedEmoji:  { fontSize: 32 },
  selectedName:   { flex: 1, fontSize: 17, fontWeight: "700", color: BRAND },
  fieldLabel:     { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  fieldInput:     { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  confirmBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
