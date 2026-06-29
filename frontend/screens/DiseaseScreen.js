import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

// Disease symptom database — maps visual symptoms to likely causes + treatments
const DISEASE_DB = [
  {
    id: "blight",
    name: "Potato / Tomato Blight",
    symptoms: ["brown patches on leaves", "white mould on leaf undersides", "black stems", "rotting fruit"],
    plants: ["Tomato", "Potato"],
    emoji: "🍂",
    severity: "high",
    treatment: "Remove and bin affected material immediately. Do not compost. Spray remaining plants with a copper-based fungicide. Improve airflow. Avoid overhead watering.",
    prevention: "Choose blight-resistant varieties. Rotate crops. Water at the base.",
    organic: true,
  },
  {
    id: "powdery_mildew",
    name: "Powdery Mildew",
    symptoms: ["white powdery coating on leaves", "distorted young shoots", "yellowing", "premature leaf drop"],
    plants: ["Courgette", "Cucumber", "Rose", "Pea", "Apple"],
    emoji: "⬜",
    severity: "medium",
    treatment: "Remove worst-affected leaves. Spray with diluted milk (1:9 milk to water), sodium bicarbonate solution, or a sulphur-based fungicide.",
    prevention: "Improve airflow. Avoid drought stress. Water regularly.",
    organic: true,
  },
  {
    id: "aphids",
    name: "Aphid Infestation",
    symptoms: ["clusters of small insects on new growth", "sticky honeydew on leaves", "curled or distorted leaves", "black sooty mould"],
    plants: ["Rose", "Bean", "Tomato", "Lettuce", "Broad Bean"],
    emoji: "🐛",
    severity: "medium",
    treatment: "Blast off with a strong jet of water. Apply insecticidal soap spray. Encourage ladybirds and lacewings. Pinch out infested growing tips.",
    prevention: "Grow nasturtiums as a sacrificial plant. Encourage natural predators.",
    organic: true,
  },
  {
    id: "slug_damage",
    name: "Slug & Snail Damage",
    symptoms: ["irregular holes in leaves", "slime trails", "seedlings disappearing overnight", "damage at soil level"],
    plants: ["Lettuce", "Hostas", "Strawberry", "Cabbage", "Seedlings"],
    emoji: "🐌",
    severity: "medium",
    treatment: "Set beer traps. Apply nematodes (Phasmarhabditis hermaphroditis) when soil above 5°C. Use copper tape around pots. Collect slugs by torchlight.",
    prevention: "Remove debris and hiding spots. Raise containers. Avoid evening watering.",
    organic: true,
  },
  {
    id: "clubroot",
    name: "Clubroot",
    symptoms: ["wilting despite moisture", "yellow leaves", "swollen distorted roots", "stunted growth"],
    plants: ["Cabbage", "Broccoli", "Kale", "Turnip"],
    emoji: "🫚",
    severity: "high",
    treatment: "No cure once infected. Remove and bin all affected plants. Do not compost. Lime the soil to raise pH above 7. Avoid the site for 20+ years.",
    prevention: "Rotate brassicas strictly every 4 years. Buy certified disease-free transplants.",
    organic: false,
  },
  {
    id: "rust",
    name: "Rust (Fungal)",
    symptoms: ["orange or brown powdery pustules on leaf undersides", "yellow patches on leaf tops", "premature leaf drop"],
    plants: ["Leek", "Garlic", "Rose", "Mint", "Hollyhock"],
    emoji: "🟠",
    severity: "medium",
    treatment: "Remove affected leaves. Avoid overhead watering. Apply sulphur-based fungicide. Improve airflow.",
    prevention: "Choose rust-resistant varieties. Space plants adequately.",
    organic: true,
  },
  {
    id: "grey_mould",
    name: "Grey Mould (Botrytis)",
    symptoms: ["fluffy grey mould on flowers, fruit or stems", "brown rotting patches", "shrivelled petals"],
    plants: ["Strawberry", "Tomato", "Lettuce", "Fuchsia", "Dahlia"],
    emoji: "🌫️",
    severity: "medium",
    treatment: "Remove all affected material. Improve ventilation. Reduce humidity in greenhouses. Apply copper fungicide or Bacillus subtilis spray.",
    prevention: "Deadhead regularly. Avoid splashing water on foliage. Space plants well.",
    organic: true,
  },
  {
    id: "blackspot",
    name: "Rose Blackspot",
    symptoms: ["circular black spots on rose leaves", "yellow halos around spots", "early leaf drop"],
    plants: ["Rose"],
    emoji: "⚫",
    severity: "medium",
    treatment: "Remove and bin affected leaves — do not compost. Spray with a fungicide containing myclobutanil or trifloxystrobin every 2 weeks.",
    prevention: "Choose disease-resistant rose varieties. Mulch to prevent spores splashing up. Water at base.",
    organic: false,
  },
  {
    id: "iron_deficiency",
    name: "Iron / Manganese Deficiency",
    symptoms: ["yellowing between leaf veins (older leaves stay green)", "pale yellow new growth", "poor growth on alkaline soil"],
    plants: ["Raspberry", "Blueberry", "Rhododendron", "Hydrangea"],
    emoji: "💛",
    severity: "low",
    treatment: "Apply iron chelate (sequestered iron) as a foliar spray or soil drench. Acidify soil with sulphur chips or ericaceous compost.",
    prevention: "Use ericaceous compost for acid-loving plants. Test soil pH annually.",
    organic: true,
  },
  {
    id: "vine_weevil",
    name: "Vine Weevil",
    symptoms: ["notched leaf margins (adult)", "wilting despite watering", "plant suddenly collapses", "C-shaped white grubs in compost"],
    plants: ["Strawberry", "Hosta", "Fuchsia", "Primula"],
    emoji: "🪲",
    severity: "high",
    treatment: "Apply beneficial nematodes (Steinernema kraussei) to moist compost in August–October. Report adults manually. Remove grubs from compost.",
    prevention: "Check compost of bought plants. Use nematode treatments preventatively in containers.",
    organic: true,
  },
  {
    id: "carrot_fly",
    name: "Carrot Fly",
    symptoms: ["reddish foliage wilting", "tunnels and rusty streaks in roots", "small white maggots in carrots"],
    plants: ["Carrot", "Parsnip", "Celery", "Parsley"],
    emoji: "🪰",
    severity: "medium",
    treatment: "No chemical treatment once larvae inside root. Remove affected crops. Cover following sowings with fine mesh (Enviromesh) immediately after sowing.",
    prevention: "Cover with fleece or mesh. Sow after late May (avoids first generation). Grow in raised beds with 60 cm barriers.",
    organic: true,
  },
  {
    id: "nutrient_deficiency_n",
    name: "Nitrogen Deficiency",
    symptoms: ["pale yellow-green leaves starting from oldest", "weak spindly growth", "red or purple tints on stems", "early leaf drop"],
    plants: ["Tomato", "Brassica", "Potato", "Lettuce"],
    emoji: "🌿",
    severity: "low",
    treatment: "Apply a high-nitrogen fertiliser such as dried blood, hoof and horn, or liquid seaweed. For immediate effect use a liquid feed.",
    prevention: "Incorporate well-rotted organic matter before planting. Use a balanced NPK fertiliser at planting time.",
    organic: true,
  },
];

const SEVERITY_COLOUR = { high: "#e53935", medium: "#fb8c00", low: "#43a047" };
const SEVERITY_LABEL  = { high: "Serious", medium: "Moderate", low: "Minor" };

export default function DiseaseScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [imageUri,   setImageUri]   = useState(null);
  const [analysing,  setAnalysing]  = useState(false);
  const [results,    setResults]    = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [plantFilter, setPlantFilter] = useState("All");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      analyse();
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      analyse(result.assets[0].uri);
    }
  };

  // Simulated analysis — in production this would call a disease detection model or API
  const analyse = async (uri) => {
    setAnalysing(true);
    setResults(null);
    setSelected(null);
    // Simulate network/model delay
    await new Promise(r => setTimeout(r, 1800));
    // Return all diseases sorted alphabetically as a checklist for the user to identify
    setResults(DISEASE_DB);
    setAnalysing(false);
  };

  const allPlants = ["All", ...new Set(DISEASE_DB.flatMap(d => d.plants))].sort();
  const filtered = results
    ? (plantFilter === "All" ? results : results.filter(d => d.plants.includes(plantFilter)))
    : null;

  return (
    <ScrollView style={s.container}>
      {/* Header */}
      <View style={s.hero}>
        <Ionicons name="bug" size={40} color="#fff" />
        <Text style={s.heroTitle}>Plant Disease Checker</Text>
        <Text style={s.heroSub}>Photograph symptoms or browse common UK plant problems</Text>
      </View>

      {/* Camera buttons */}
      <View style={s.btnRow}>
        <TouchableOpacity style={s.camBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={22} color="#fff" />
          <Text style={s.camBtnText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.camBtn, { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.brand }]} onPress={pickImage}>
          <Ionicons name="images" size={22} color={theme.brand} />
          <Text style={[s.camBtnText, { color: theme.brand }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={s.previewImage} resizeMode="cover" />
      )}

      {analysing && (
        <View style={s.analysing}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[s.analysingText, { color: theme.textSecondary }]}>Analysing symptoms…</Text>
        </View>
      )}

      {/* Plant filter */}
      {results && !analysing && (
        <>
          <Text style={[s.sectionTitle, { color: theme.brand }]}>Filter by plant</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
            {allPlants.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.filterChip, plantFilter === p && { backgroundColor: theme.brand }]}
                onPress={() => setPlantFilter(p)}
              >
                <Text style={[s.filterChipText, plantFilter === p && { color: "#fff" }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Disease list */}
      {!results && !analysing && (
        <>
          <Text style={[s.sectionTitle, { color: theme.brand }]}>Common UK Problems</Text>
          {DISEASE_DB.map(d => (
            <DiseaseCard key={d.id} disease={d} onPress={() => setSelected(d)} theme={theme} s={s} />
          ))}
        </>
      )}

      {filtered && !analysing && (
        <>
          <Text style={[s.sectionTitle, { color: theme.brand }]}>
            {filtered.length} potential issue{filtered.length !== 1 ? "s" : ""} — tap to see treatment
          </Text>
          {filtered.map(d => (
            <DiseaseCard key={d.id} disease={d} onPress={() => setSelected(selected?.id === d.id ? null : d)} theme={theme} s={s} expanded={selected?.id === d.id} />
          ))}
        </>
      )}

      {/* Detail panel */}
      {selected && (
        <View style={[s.detailCard, { backgroundColor: theme.card }]}>
          <Text style={[s.detailTitle, { color: theme.text }]}>{selected.emoji} {selected.name}</Text>

          <View style={s.detailRow}>
            <View style={[s.severityBadge, { backgroundColor: SEVERITY_COLOUR[selected.severity] }]}>
              <Text style={s.severityText}>{SEVERITY_LABEL[selected.severity]}</Text>
            </View>
            {selected.organic && (
              <View style={[s.severityBadge, { backgroundColor: "#2e7d32" }]}>
                <Text style={s.severityText}>🌿 Organic fix available</Text>
              </View>
            )}
          </View>

          <Text style={[s.detailSection, { color: theme.brand }]}>Symptoms</Text>
          {selected.symptoms.map(sym => (
            <View key={sym} style={s.symRow}>
              <Ionicons name="ellipse" size={6} color={theme.accent} />
              <Text style={[s.symText, { color: theme.textSecondary }]}>{sym}</Text>
            </View>
          ))}

          <Text style={[s.detailSection, { color: theme.brand }]}>Treatment</Text>
          <Text style={[s.detailText, { color: theme.textSecondary }]}>{selected.treatment}</Text>

          <Text style={[s.detailSection, { color: theme.brand }]}>Prevention</Text>
          <Text style={[s.detailText, { color: theme.textSecondary }]}>{selected.prevention}</Text>

          <Text style={[s.detailSection, { color: theme.brand }]}>Affects</Text>
          <View style={s.plantTagRow}>
            {selected.plants.map(p => (
              <View key={p} style={[s.plantTag, { backgroundColor: theme.bg }]}>
                <Text style={[s.plantTagText, { color: theme.textSecondary }]}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DiseaseCard({ disease, onPress, theme, s, expanded }) {
  return (
    <TouchableOpacity
      style={[s.diseaseCard, { backgroundColor: theme.card }, expanded && { borderColor: theme.accent, borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ fontSize: 28 }}>{disease.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.diseaseName, { color: theme.text }]}>{disease.name}</Text>
          <Text style={[s.diseasePlants, { color: theme.textMuted }]}>{disease.plants.slice(0, 3).join(", ")}{disease.plants.length > 3 ? "…" : ""}</Text>
        </View>
        <View style={[s.sevDot, { backgroundColor: SEVERITY_COLOUR[disease.severity] }]} />
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: t.bg },
  hero:          { backgroundColor: t.brand, padding: 24, alignItems: "center", gap: 8 },
  heroTitle:     { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroSub:       { color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center" },
  btnRow:        { flexDirection: "row", margin: 16, gap: 12 },
  camBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.brand, borderRadius: 12, paddingVertical: 12 },
  camBtnText:    { fontWeight: "700", fontSize: 15, color: "#fff" },
  previewImage:  { width: "100%", height: 200 },
  analysing:     { padding: 40, alignItems: "center", gap: 12 },
  analysingText: { fontSize: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: "700", marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  filterScroll:  { paddingLeft: 16, marginBottom: 12 },
  filterChip:    { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
  filterChipText:{ fontSize: 13, color: t.text },
  diseaseCard:   { margin: 12, marginBottom: 0, borderRadius: 14, padding: 14, shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  diseaseName:   { fontSize: 15, fontWeight: "700" },
  diseasePlants: { fontSize: 12, marginTop: 2 },
  sevDot:        { width: 10, height: 10, borderRadius: 5 },
  detailCard:    { margin: 12, borderRadius: 14, padding: 16 },
  detailTitle:   { fontSize: 20, fontWeight: "800", marginBottom: 12 },
  detailRow:     { flexDirection: "row", gap: 8, marginBottom: 12 },
  severityBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  severityText:  { color: "#fff", fontSize: 12, fontWeight: "600" },
  detailSection: { fontSize: 14, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  symRow:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  symText:       { fontSize: 13, flex: 1 },
  detailText:    { fontSize: 13, lineHeight: 20 },
  plantTagRow:   { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  plantTag:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  plantTagText:  { fontSize: 12 },
});
