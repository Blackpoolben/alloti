import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPlantDetail, getPlantCompanions, addToGarden } from "../api/gardeningApi";

const BRAND  = "#2D6A4F";
const ACCENT = "#52B788";
const BG     = "#F0F7F4";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DIFFICULTY_COLOUR = { easy: "#43a047", moderate: "#fb8c00", hard: "#e53935" };

function MonthBubbles({ months, colour }) {
  return (
    <View style={styles.bubbleRow}>
      {MONTHS.map((m, i) => {
        const active = months.includes(i + 1);
        return (
          <View key={m} style={[styles.bubble, active && { backgroundColor: colour }]}>
            <Text style={[styles.bubbleText, active && { color: "#fff" }]}>{m[0]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Section({ title, icon, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={BRAND} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function PlantDetailScreen({ route, navigation }) {
  const plantId = route.params?.plantId;
  const [plant,      setPlant]      = useState(route.params?.plant || null);
  const [companions, setCompanions] = useState(null);
  const [loading,    setLoading]    = useState(!route.params?.plant);
  const [addingToGarden, setAdding] = useState(false);

  useEffect(() => {
    if (!plant && plantId) {
      getPlantDetail(plantId)
        .then(setPlant)
        .catch(() => Alert.alert("Error", "Could not load plant details"))
        .finally(() => setLoading(false));
    }
    if (plantId) {
      getPlantCompanions(plantId).then(setCompanions).catch(() => {});
    }
  }, [plantId]);

  const handleAddToGarden = async () => {
    if (!plant) return;
    setAdding(true);
    try {
      await addToGarden({ plant_id: plant.id, planted_at: new Date().toISOString().split("T")[0] });
      Alert.alert("Added!", `${plant.common_name} added to My Garden 🌱`);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  if (!plant)  return <View style={styles.center}><Text>Plant not found</Text></View>;

  const allSowMonths = [...new Set([...plant.sow_indoors, ...plant.sow_outdoors])];

  return (
    <ScrollView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{plant.emoji}</Text>
        <Text style={styles.heroName}>{plant.common_name}</Text>
        <Text style={styles.heroLatin}>{plant.latin_name}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: DIFFICULTY_COLOUR[plant.difficulty] }]}>
            <Text style={styles.badgeText}>{plant.difficulty}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plant.category}</Text>
          </View>
          {plant.frost_tender && (
            <View style={[styles.badge, { backgroundColor: "#1e88e5" }]}>
              <Ionicons name="snow" size={12} color="#fff" />
              <Text style={styles.badgeText}> frost tender</Text>
            </View>
          )}
        </View>
        <Text style={styles.description}>{plant.description}</Text>
      </View>

      {/* Add to garden button */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAddToGarden} disabled={addingToGarden}>
        {addingToGarden
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.addBtnText}>Add to My Garden</Text></>
        }
      </TouchableOpacity>

      {/* Planting calendar */}
      <Section title="Planting Calendar" icon="calendar-outline">
        {plant.sow_indoors.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.calLabel}>🏠 Sow Indoors</Text>
            <MonthBubbles months={plant.sow_indoors} colour={BRAND} />
          </View>
        )}
        {plant.sow_outdoors.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.calLabel}>🌿 Sow Outdoors</Text>
            <MonthBubbles months={plant.sow_outdoors} colour={ACCENT} />
          </View>
        )}
        {plant.transplant.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.calLabel}>🌱 Transplant</Text>
            <MonthBubbles months={plant.transplant} colour="#8d6e63" />
          </View>
        )}
        {plant.harvest.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.calLabel}>🧺 Harvest</Text>
            <MonthBubbles months={plant.harvest} colour="#f9a825" />
          </View>
        )}
        {plant.prune.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.calLabel}>✂️ Prune</Text>
            <MonthBubbles months={plant.prune} colour="#8e24aa" />
          </View>
        )}
      </Section>

      {/* Pruning notes */}
      {plant.prune_notes && (
        <Section title="Pruning Guide" icon="cut-outline">
          <Text style={styles.bodyText}>{plant.prune_notes}</Text>
        </Section>
      )}

      {/* Growing conditions */}
      <Section title="Growing Conditions" icon="leaf-outline">
        <InfoRow icon="sunny"       label="Sunlight"  value={plant.sunlight?.replace("_", " ")} />
        <InfoRow icon="water"       label="Watering"  value={plant.watering} />
        <InfoRow icon="earth"       label="Soil"       value={plant.soil} />
        <InfoRow icon="resize"      label="Spacing"   value={`${plant.spacing_cm} cm`} />
        <InfoRow icon="arrow-up"    label="Height"    value={`up to ${plant.height_cm} cm`} />
      </Section>

      {/* Pests & problems */}
      {plant.pests?.length > 0 && (
        <Section title="Pests & Problems" icon="bug-outline">
          <View style={styles.chipRow}>
            {plant.pests.map(p => (
              <View key={p} style={styles.pestChip}>
                <Text style={styles.pestChipText}>{p.replace(/_/g, " ")}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Companions */}
      {companions && (
        <Section title="Companion Planting" icon="people-outline">
          {companions.good_companions?.length > 0 && (
            <>
              <Text style={styles.calLabel}>✅ Good companions</Text>
              <View style={styles.chipRow}>
                {companions.good_companions.map(c => (
                  <View key={c} style={styles.goodChip}>
                    <Text style={styles.goodChipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {companions.avoid?.length > 0 && (
            <>
              <Text style={[styles.calLabel, { marginTop: 12 }]}>❌ Avoid near</Text>
              <View style={styles.chipRow}>
                {companions.avoid.map(c => (
                  <View key={c} style={styles.badChip}>
                    <Text style={styles.badChipText}>{c.replace(/_/g, " ")}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Section>
      )}

      {/* Tips */}
      {plant.tips && (
        <Section title="Top Tip" icon="bulb-outline">
          <Text style={styles.bodyText}>💡 {plant.tips}</Text>
        </Section>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={ACCENT} style={{ width: 24 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  center:       { flex: 1, justifyContent: "center", alignItems: "center" },
  hero:         { backgroundColor: BRAND, padding: 24, alignItems: "center" },
  heroEmoji:    { fontSize: 56, marginBottom: 8 },
  heroName:     { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center" },
  heroLatin:    { fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.75)", marginBottom: 12 },
  badgeRow:     { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 },
  badge:        { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  badgeText:    { color: "#fff", fontSize: 12, fontWeight: "600" },
  description:  { color: "rgba(255,255,255,0.9)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  addBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#43a047", margin: 16, borderRadius: 12, padding: 14, gap: 8 },
  addBtnText:   { color: "#fff", fontWeight: "700", fontSize: 15 },
  section:      { backgroundColor: "#fff", margin: 12, borderRadius: 14, padding: 16 },
  sectionHeader:{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: BRAND },
  calLabel:     { fontSize: 13, color: "#555", marginBottom: 6 },
  bubbleRow:    { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  bubble:       { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  bubbleText:   { fontSize: 10, fontWeight: "600", color: "#999" },
  bodyText:     { fontSize: 14, color: "#444", lineHeight: 22 },
  infoRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  infoLabel:    { width: 70, fontSize: 13, color: "#888" },
  infoValue:    { flex: 1, fontSize: 13, color: "#333", textTransform: "capitalize" },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pestChip:     { backgroundColor: "#fff3e0", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  pestChipText: { fontSize: 12, color: "#e65100", textTransform: "capitalize" },
  goodChip:     { backgroundColor: "#e8f5e9", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  goodChipText: { fontSize: 12, color: "#2e7d32" },
  badChip:      { backgroundColor: "#ffebee", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badChipText:  { fontSize: 12, color: "#c62828", textTransform: "capitalize" },
});
