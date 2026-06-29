import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { identifyPlant } from "../api/gardeningApi";
import { identifyOffline } from "../services/OfflineIdentifier";

const BRAND  = "#2D6A4F";
const ACCENT = "#52B788";

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode,        setMode]        = useState("camera"); // "camera" | "preview" | "result"
  const [imageUri,    setImageUri]    = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [facing,      setFacing]      = useState("back");
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      setImageUri(photo.uri);
      setMode("preview");
    } catch (err) {
      Alert.alert("Error", "Failed to capture photo");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Gallery access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setMode("preview");
    }
  };

  const identify = async () => {
    if (!imageUri) return;
    setLoading(true);
    setResult(null);

    let lat = null, lon = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
    } catch { /* location optional */ }

    try {
      const data = await identifyPlant(imageUri, lat, lon);
      setResult(data);
      setMode("result");
    } catch (onlineErr) {
      // Fall back to offline TFLite model
      try {
        const offlineResult = await identifyOffline(imageUri);
        setResult({ offline: true, ...offlineResult });
        setMode("result");
      } catch {
        Alert.alert("Identification failed", onlineErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageUri(null);
    setResult(null);
    setMode("camera");
  };

  // --- Permission gate ---
  if (!permission) return <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#ccc" />
        <Text style={styles.permText}>Camera access needed to identify plants</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Camera view ---
  if (mode === "camera") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            {/* Flip button */}
            <TouchableOpacity style={styles.flipBtn} onPress={() => setFacing(f => f === "back" ? "front" : "back")}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Viewfinder guide */}
            <View style={styles.viewfinderFrame} />

            <Text style={styles.hint}>Point camera at a plant</Text>

            <View style={styles.captureRow}>
              <TouchableOpacity style={styles.galleryBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <View style={{ width: 50 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // --- Preview ---
  if (mode === "preview") {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
            <Ionicons name="arrow-back" size={20} color={BRAND} />
            <Text style={[styles.btnText, { color: BRAND }]}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.identifyBtn} onPress={identify} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="leaf" size={20} color="#fff" /><Text style={styles.btnText}>Identify Plant</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Result ---
  return (
    <ScrollView style={styles.resultContainer}>
      <Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="cover" />

      {result && (
        <View style={styles.resultCard}>
          {result.offline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={14} color="#fff" />
              <Text style={styles.offlineBadgeText}>Offline result</Text>
            </View>
          )}

          <Text style={styles.resultName}>{result.top_match?.common_name || result.topMatch}</Text>
          <Text style={styles.resultLatin}>{result.top_match?.species || result.species}</Text>

          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${result.top_match?.confidence || result.confidence || 0}%` }]} />
            </View>
            <Text style={styles.confidenceValue}>{result.top_match?.confidence || result.confidence || 0}%</Text>
          </View>

          {result.top_match?.family && (
            <Text style={styles.resultMeta}>Family: {result.top_match.family}</Text>
          )}

          {result.db_match && (
            <TouchableOpacity
              style={styles.viewDetailBtn}
              onPress={() => navigation.navigate("History", {
                screen: "PlantDetail", params: { plantId: result.db_match.id }
              })}
            >
              <Ionicons name="information-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>View UK Planting Guide</Text>
            </TouchableOpacity>
          )}

          {/* Other candidates */}
          {result.all_results?.length > 1 && (
            <>
              <Text style={styles.altTitle}>Other possibilities</Text>
              {result.all_results.slice(1).map((r, i) => (
                <View key={i} style={styles.altRow}>
                  <Text style={styles.altName}>{r.common_name || r.species}</Text>
                  <Text style={styles.altScore}>{r.confidence}%</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.newScanBtn} onPress={reset}>
        <Ionicons name="camera" size={18} color="#fff" />
        <Text style={styles.btnText}>New Scan</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:           { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  permText:         { textAlign: "center", color: "#555", margin: 20, fontSize: 15 },
  btn:              { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:          { color: "#fff", fontWeight: "600", fontSize: 15, marginLeft: 6 },
  cameraContainer:  { flex: 1 },
  camera:           { flex: 1 },
  cameraOverlay:    { flex: 1, justifyContent: "space-between", alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  flipBtn:          { alignSelf: "flex-end", marginRight: 20, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20, padding: 8 },
  viewfinderFrame:  {
    width: 240, height: 240, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 16, marginBottom: 10,
  },
  hint:             { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  captureRow:       { flexDirection: "row", alignItems: "center", gap: 30 },
  galleryBtn:       { backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 25, padding: 12 },
  captureBtn:       {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  captureInner:     { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff" },
  previewContainer: { flex: 1, backgroundColor: "#000" },
  previewImage:     { flex: 1 },
  previewActions:   {
    flexDirection: "row", padding: 20, gap: 12,
    backgroundColor: "#fff", justifyContent: "space-between",
  },
  retakeBtn:        {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: BRAND, borderRadius: 12, paddingVertical: 12,
  },
  identifyBtn:      {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12,
  },
  resultContainer:  { flex: 1, backgroundColor: "#f5f5f5" },
  resultImage:      { width: "100%", height: 260 },
  resultCard:       { margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  offlineBadge:     {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#757575", alignSelf: "flex-start",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  offlineBadgeText: { color: "#fff", fontSize: 12 },
  resultName:       { fontSize: 24, fontWeight: "700", color: "#222" },
  resultLatin:      { fontSize: 14, color: "#888", fontStyle: "italic", marginBottom: 16 },
  confidenceRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  confidenceLabel:  { fontSize: 13, color: "#555", width: 80 },
  confidenceBar:    { flex: 1, height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, overflow: "hidden" },
  confidenceFill:   { height: "100%", backgroundColor: ACCENT, borderRadius: 4 },
  confidenceValue:  { fontSize: 13, fontWeight: "600", color: BRAND, width: 40, textAlign: "right" },
  resultMeta:       { fontSize: 13, color: "#777", marginBottom: 6 },
  viewDetailBtn:    {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: BRAND, borderRadius: 10, padding: 12, marginTop: 12,
  },
  altTitle:         { fontSize: 14, fontWeight: "600", color: "#555", marginTop: 16, marginBottom: 8 },
  altRow:           { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  altName:          { fontSize: 13, color: "#444" },
  altScore:         { fontSize: 13, color: "#888" },
  newScanBtn:       {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: BRAND, margin: 16, borderRadius: 12, padding: 14,
  },
});
