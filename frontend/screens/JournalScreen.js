import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Image, Alert, ScrollView,
  ActivityIndicator, RefreshControl, Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const JOURNAL_DIR = FileSystem.documentDirectory + "journal/";
const JOURNAL_INDEX = JOURNAL_DIR + "index.json";

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(JOURNAL_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(JOURNAL_DIR, { intermediates: true });
}

async function loadEntries() {
  await ensureDir();
  const info = await FileSystem.getInfoAsync(JOURNAL_INDEX);
  if (!info.exists) return [];
  const raw = await FileSystem.readAsStringAsync(JOURNAL_INDEX);
  return JSON.parse(raw);
}

async function saveEntries(entries) {
  await ensureDir();
  await FileSystem.writeAsStringAsync(JOURNAL_INDEX, JSON.stringify(entries));
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

const MOOD_OPTIONS = ["🌱", "☀️", "🌧️", "❄️", "🌿", "🍅", "🌸", "🥕"];

export default function JournalScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editEntry,  setEditEntry]  = useState(null);
  const [search,     setSearch]     = useState("");

  // New entry form state
  const [title,    setTitle]    = useState("");
  const [body,     setBody]     = useState("");
  const [mood,     setMood]     = useState("🌱");
  const [photos,   setPhotos]   = useState([]);
  const [tags,     setTags]     = useState("");
  const [saving,   setSaving]   = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try {
      const data = await loadEntries();
      setEntries(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openNew = () => {
    setEditEntry(null);
    setTitle(""); setBody(""); setMood("🌱"); setPhotos([]); setTags("");
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setTitle(entry.title); setBody(entry.body); setMood(entry.mood || "🌱");
    setPhotos(entry.photos || []); setTags((entry.tags || []).join(", "));
    setShowModal(true);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, 6));
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 6));
    }
  };

  const saveEntry = async () => {
    if (!title.trim()) { Alert.alert("Title required"); return; }
    setSaving(true);
    try {
      // Copy photos to permanent app storage
      const savedPhotos = await Promise.all(
        photos.map(async (uri) => {
          if (uri.startsWith(JOURNAL_DIR)) return uri;
          const filename = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
          const dest = JOURNAL_DIR + filename;
          await FileSystem.copyAsync({ from: uri, to: dest });
          return dest;
        })
      );

      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      const all = await loadEntries();

      if (editEntry) {
        const idx = all.findIndex(e => e.id === editEntry.id);
        if (idx !== -1) all[idx] = { ...editEntry, title, body, mood, photos: savedPhotos, tags: tagList, updatedAt: new Date().toISOString() };
      } else {
        all.push({
          id:    Date.now().toString(),
          date:  new Date().toISOString(),
          title, body, mood, photos: savedPhotos, tags: tagList,
        });
      }

      await saveEntries(all);
      setShowModal(false);
      load();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (entry) => {
    Alert.alert("Delete Entry", `Delete "${entry.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const all = await loadEntries();
          await saveEntries(all.filter(e => e.id !== entry.id));
          load();
        },
      },
    ]);
  };

  const filtered = search
    ? entries.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.body?.toLowerCase().includes(search.toLowerCase()) ||
        (e.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : entries;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;

  return (
    <View style={s.container}>
      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={16} color={theme.textMuted} />
        <TextInput style={s.searchInput} placeholder="Search journal…" placeholderTextColor={theme.textMuted} value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color={theme.textMuted} /></TouchableOpacity> : null}
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📔</Text>
          <Text style={s.emptyTitle}>No journal entries yet</Text>
          <Text style={s.emptyText}>Record your garden's progress with photos and notes</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openNew}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.emptyBtnText}>New Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.accent} />}
          renderItem={({ item }) => (
            <JournalCard entry={item} onEdit={() => openEdit(item)} onDelete={() => deleteEntry(item)} theme={theme} s={s} />
          )}
        />
      )}

      {/* FAB */}
      {filtered.length > 0 && (
        <TouchableOpacity style={s.fab} onPress={openNew}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: theme.card }]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: theme.text }]}>{editEntry ? "Edit Entry" : "New Journal Entry"}</Text>
            <TouchableOpacity onPress={saveEntry} disabled={saving}>
              {saving ? <ActivityIndicator color={theme.accent} /> : <Text style={[s.saveText, { color: theme.accent }]}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Mood picker */}
            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Mood</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {MOOD_OPTIONS.map(m => (
                <TouchableOpacity key={m} style={[s.moodBtn, mood === m && { backgroundColor: theme.accent }]} onPress={() => setMood(m)}>
                  <Text style={{ fontSize: 22 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Title *</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. First tomatoes turning red!"
              placeholderTextColor={theme.textMuted}
              value={title} onChangeText={setTitle}
            />

            {/* Body */}
            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput
              style={[s.input, s.textarea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="What happened in the garden today?"
              placeholderTextColor={theme.textMuted}
              value={body} onChangeText={setBody}
              multiline
            />

            {/* Tags */}
            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Tags (comma separated)</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. tomato, watering, pests"
              placeholderTextColor={theme.textMuted}
              value={tags} onChangeText={setTags}
            />

            {/* Photos */}
            <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>Photos ({photos.length}/6)</Text>
            <View style={s.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={s.photoThumb}>
                  <Image source={{ uri }} style={s.thumbImg} />
                  <TouchableOpacity style={s.removePhoto} onPress={() => setPhotos(p => p.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={18} color="#e53935" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 6 && (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity style={[s.addPhotoBtn, { borderColor: theme.border }]} onPress={takePhoto}>
                    <Ionicons name="camera" size={22} color={theme.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.addPhotoBtn, { borderColor: theme.border }]} onPress={pickPhoto}>
                    <Ionicons name="images" size={22} color={theme.accent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function JournalCard({ entry, onEdit, onDelete, theme, s }) {
  return (
    <TouchableOpacity style={[s.card, { backgroundColor: theme.card }]} onPress={onEdit} activeOpacity={0.85}>
      <View style={s.cardTop}>
        <Text style={s.cardMood}>{entry.mood || "🌱"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={1}>{entry.title}</Text>
          <Text style={[s.cardDate, { color: theme.textMuted }]}>{formatDate(entry.date)}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={16} color={theme.danger} />
        </TouchableOpacity>
      </View>

      {entry.body ? <Text style={[s.cardBody, { color: theme.textSecondary }]} numberOfLines={2}>{entry.body}</Text> : null}

      {entry.photos?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {entry.photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={s.cardPhoto} />
          ))}
        </ScrollView>
      )}

      {entry.tags?.length > 0 && (
        <View style={s.tagRow}>
          {entry.tags.map(t => (
            <View key={t} style={[s.tag, { backgroundColor: theme.bg }]}>
              <Text style={[s.tagText, { color: theme.textSecondary }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: t.bg },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.bg },
  searchBar:   { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, backgroundColor: t.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14, color: t.text },
  empty:       { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyEmoji:  { fontSize: 64, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontWeight: "700", color: t.brand, marginBottom: 8 },
  emptyText:   { fontSize: 14, color: t.textMuted, textAlign: "center", marginBottom: 24 },
  emptyBtn:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.brand, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText:{ color: "#fff", fontWeight: "700", fontSize: 15 },
  fab:         { position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: t.brand, justifyContent: "center", alignItems: "center", shadowColor: t.shadow, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  card:        { borderRadius: 14, marginBottom: 12, padding: 14, shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardTop:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  cardMood:    { fontSize: 26 },
  cardTitle:   { fontSize: 16, fontWeight: "700" },
  cardDate:    { fontSize: 12, marginTop: 2 },
  cardBody:    { fontSize: 13, lineHeight: 18 },
  cardPhoto:   { width: 80, height: 80, borderRadius: 8, marginRight: 6 },
  tagRow:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag:         { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:     { fontSize: 11 },
  modal:       { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderColor: "#f0f0f0" },
  modalTitle:  { fontSize: 17, fontWeight: "700" },
  saveText:    { fontSize: 16, fontWeight: "700" },
  fieldLabel:  { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input:       { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  textarea:    { height: 100, textAlignVertical: "top" },
  moodBtn:     { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 8, backgroundColor: "#f0f0f0" },
  photoRow:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  photoThumb:  { position: "relative" },
  thumbImg:    { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: "absolute", top: -6, right: -6 },
  addPhotoBtn: { width: 80, height: 36, borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
});
