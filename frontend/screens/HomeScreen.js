import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getWeather, getSeasonalGuidance } from "../api/gardeningApi";

const BRAND  = "#2D6A4F";
const ACCENT = "#52B788";
const BG     = "#F0F7F4";

const WMO_CODES = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
  81: "Rain showers", 82: "Violent showers", 95: "Thunderstorm",
};

const WMO_EMOJI = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌧️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "❄️", 75: "❄️", 80: "🌦️", 81: "🌧️", 82: "⛈️", 95: "⛈️",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HomeScreen() {
  const [postcode,    setPostcode]    = useState("");
  const [inputText,   setInputText]   = useState("");
  const [weather,     setWeather]     = useState(null);
  const [seasonal,    setSeasonal]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);

  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    AsyncStorage.getItem("postcode").then(pc => {
      if (pc) { setPostcode(pc); setInputText(pc); fetchData(pc); }
    });
  }, []);

  const fetchData = useCallback(async (pc) => {
    if (!pc) return;
    setLoading(true);
    setError(null);
    try {
      const [wData, sData] = await Promise.all([
        getWeather(pc),
        getSeasonalGuidance(currentMonth, pc),
      ]);
      setWeather(wData);
      setSeasonal(sData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth]);

  const handleSearch = async () => {
    const pc = inputText.trim().toUpperCase();
    if (!pc) return;
    await AsyncStorage.setItem("postcode", pc);
    setPostcode(pc);
    fetchData(pc);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(postcode);
  };

  const cur = weather?.current || {};
  const wCode = cur.weather_code;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter UK postcode (e.g. SW1A)"
          value={inputText}
          onChangeText={setInputText}
          autoCapitalize="characters"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 40 }} />}
      {error   && <Text style={styles.errorText}>⚠️ {error}</Text>}

      {weather && !loading && (
        <>
          {/* Current weather card */}
          <View style={styles.weatherCard}>
            <Text style={styles.locationText}>
              {weather.location?.admin_district || postcode}
            </Text>
            <Text style={styles.weatherEmoji}>{WMO_EMOJI[wCode] || "🌡️"}</Text>
            <Text style={styles.tempText}>{Math.round(cur.temperature_2m ?? 0)}°C</Text>
            <Text style={styles.conditionText}>{WMO_CODES[wCode] || "–"}</Text>
            <Text style={styles.feelsLike}>
              Feels like {Math.round(cur.apparent_temperature ?? 0)}°C
            </Text>
            <View style={styles.weatherDetails}>
              <WeatherStat icon="water" label="Humidity" value={`${cur.relative_humidity_2m ?? 0}%`} />
              <WeatherStat icon="rainy" label="Rain"     value={`${cur.precipitation ?? 0} mm`} />
              <WeatherStat icon="speedometer" label="Wind" value={`${Math.round(cur.wind_speed_10m ?? 0)} km/h`} />
            </View>
          </View>

          {/* Frost info */}
          {weather.frost && (
            <View style={styles.frostCard}>
              <Ionicons name="snow" size={18} color="#4fc3f7" />
              <Text style={styles.frostText}>
                {weather.frost.region}: frost-free {weather.frost.frost_free_start} – {weather.frost.frost_free_end}
              </Text>
            </View>
          )}

          {/* 7-day forecast */}
          {weather.daily?.time && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7-Day Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {weather.daily.time.map((date, i) => {
                  const dayCode = weather.daily.weather_code?.[i];
                  const d = new Date(date);
                  return (
                    <View key={date} style={styles.dayCard}>
                      <Text style={styles.dayLabel}>{MONTHS[d.getMonth()]} {d.getDate()}</Text>
                      <Text style={styles.dayEmoji}>{WMO_EMOJI[dayCode] || "🌡️"}</Text>
                      <Text style={styles.dayMax}>{Math.round(weather.daily.temperature_2m_max?.[i] ?? 0)}°</Text>
                      <Text style={styles.dayMin}>{Math.round(weather.daily.temperature_2m_min?.[i] ?? 0)}°</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Seasonal guidance */}
      {seasonal && !loading && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {MONTHS[currentMonth - 1]} Gardening Tasks
            </Text>
            {seasonal.tasks?.map((task, i) => (
              <View key={i} style={styles.taskRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={ACCENT} />
                <Text style={styles.taskText}>{task}</Text>
              </View>
            ))}
          </View>

          {seasonal.sow?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sow Now</Text>
              <View style={styles.chipRow}>
                {seasonal.sow.map(p => (
                  <View key={p.id} style={styles.chip}>
                    <Text style={styles.chipText}>{p.emoji} {p.common_name}</Text>
                    <Text style={styles.chipSub}>{p.action === "sow_indoors" ? "indoors" : "outside"}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {seasonal.harvest?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ready to Harvest</Text>
              <View style={styles.chipRow}>
                {seasonal.harvest.map(p => (
                  <View key={p.id} style={[styles.chip, styles.harvestChip]}>
                    <Text style={styles.chipText}>{p.emoji} {p.common_name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function WeatherStat({ icon, label, value }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.8)" />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BG },
  searchRow:      { flexDirection: "row", margin: 16, gap: 8 },
  input:          {
    flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: "#ddd",
  },
  searchBtn:      { backgroundColor: BRAND, borderRadius: 10, padding: 12, justifyContent: "center" },
  errorText:      { color: "#c62828", margin: 16, textAlign: "center" },
  weatherCard:    {
    margin: 16, borderRadius: 16, backgroundColor: BRAND,
    padding: 20, alignItems: "center",
  },
  locationText:   { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 4 },
  weatherEmoji:   { fontSize: 52, marginVertical: 4 },
  tempText:       { color: "#fff", fontSize: 48, fontWeight: "700" },
  conditionText:  { color: "rgba(255,255,255,0.9)", fontSize: 16, marginTop: 2 },
  feelsLike:      { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  weatherDetails: { flexDirection: "row", marginTop: 16, gap: 20 },
  statItem:       { alignItems: "center", gap: 2 },
  statLabel:      { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  statValue:      { color: "#fff", fontSize: 13, fontWeight: "600" },
  frostCard:      {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#e3f2fd", borderRadius: 10, marginHorizontal: 16,
    marginBottom: 8, padding: 12,
  },
  frostText:      { color: "#1565c0", fontSize: 13, flex: 1 },
  section:        { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle:   { fontSize: 17, fontWeight: "700", color: BRAND, marginBottom: 10 },
  taskRow:        { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  taskText:       { color: "#333", fontSize: 14, flex: 1, lineHeight: 20 },
  chipRow:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:           {
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 6, borderWidth: 1, borderColor: ACCENT,
  },
  harvestChip:    { borderColor: "#f9a825", backgroundColor: "#fff9e6" },
  chipText:       { fontSize: 13, color: "#333" },
  chipSub:        { fontSize: 10, color: "#888", marginTop: 1 },
  dayCard:        {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    alignItems: "center", marginRight: 8, minWidth: 65,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  dayLabel:       { fontSize: 11, color: "#888", marginBottom: 4 },
  dayEmoji:       { fontSize: 22, marginVertical: 4 },
  dayMax:         { fontSize: 14, fontWeight: "700", color: "#333" },
  dayMin:         { fontSize: 12, color: "#999" },
});
