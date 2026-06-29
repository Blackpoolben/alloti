import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getWeather, getSeasonalGuidance } from "../api/gardeningApi";

const WMO_CODES = {
  0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
  45:"Foggy",48:"Icy fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
  61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",
  75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Violent showers",95:"Thunderstorm",
};
const WMO_EMOJI = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌧️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"❄️",75:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HomeScreen() {
  const { theme } = useTheme();
  const s = makeStyles(theme);

  const [inputText,  setInputText]  = useState("");
  const [postcode,   setPostcode]   = useState("");
  const [weather,    setWeather]    = useState(null);
  const [seasonal,   setSeasonal]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    AsyncStorage.getItem("postcode").then(pc => {
      if (pc) { setPostcode(pc); setInputText(pc); fetchData(pc); }
    });
  }, []);

  const fetchData = useCallback(async (pc) => {
    if (!pc) return;
    setLoading(true); setError(null);
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
      setLoading(false); setRefreshing(false);
    }
  }, [currentMonth]);

  const handleSearch = async () => {
    const pc = inputText.trim().toUpperCase();
    if (!pc) return;
    await AsyncStorage.setItem("postcode", pc);
    setPostcode(pc);
    fetchData(pc);
  };

  const cur   = weather?.current || {};
  const wCode = cur.weather_code;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(postcode); }} tintColor={theme.accent} />}
    >
      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Enter UK postcode (e.g. SW1A)"
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          autoCapitalize="characters"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={[s.searchBtn, { backgroundColor: theme.brand }]} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />}
      {error   && <Text style={[s.errorText, { color: theme.danger }]}>⚠️ {error}</Text>}

      {weather && !loading && (
        <>
          {/* Current weather */}
          <View style={[s.weatherCard, { backgroundColor: theme.brand }]}>
            <Text style={s.locationText}>{weather.location?.admin_district || postcode}</Text>
            <Text style={s.weatherEmoji}>{WMO_EMOJI[wCode] || "🌡️"}</Text>
            <Text style={s.tempText}>{Math.round(cur.temperature_2m ?? 0)}°C</Text>
            <Text style={s.conditionText}>{WMO_CODES[wCode] || "–"}</Text>
            <Text style={s.feelsLike}>Feels like {Math.round(cur.apparent_temperature ?? 0)}°C</Text>
            <View style={s.statsRow}>
              <WStat icon="water"       label="Humidity" value={`${cur.relative_humidity_2m ?? 0}%`} />
              <WStat icon="rainy"       label="Rain"     value={`${cur.precipitation ?? 0} mm`} />
              <WStat icon="speedometer" label="Wind"     value={`${Math.round(cur.wind_speed_10m ?? 0)} km/h`} />
            </View>
          </View>

          {/* Frost info */}
          {weather.frost && (
            <View style={[s.frostCard, { backgroundColor: theme.card }]}>
              <Ionicons name="snow" size={18} color="#4fc3f7" />
              <Text style={[s.frostText, { color: theme.textSecondary }]}>
                {weather.frost.region}: frost-free {weather.frost.frost_free_start} – {weather.frost.frost_free_end}
              </Text>
            </View>
          )}

          {/* 7-day */}
          {weather.daily?.time && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.brand }]}>7-Day Forecast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {weather.daily.time.map((date, i) => {
                  const dc = weather.daily.weather_code?.[i];
                  const d  = new Date(date);
                  return (
                    <View key={date} style={[s.dayCard, { backgroundColor: theme.card }]}>
                      <Text style={[s.dayLabel, { color: theme.textMuted }]}>{MONTHS[d.getMonth()]} {d.getDate()}</Text>
                      <Text style={s.dayEmoji}>{WMO_EMOJI[dc] || "🌡️"}</Text>
                      <Text style={[s.dayMax, { color: theme.text }]}>{Math.round(weather.daily.temperature_2m_max?.[i] ?? 0)}°</Text>
                      <Text style={[s.dayMin, { color: theme.textMuted }]}>{Math.round(weather.daily.temperature_2m_min?.[i] ?? 0)}°</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Seasonal */}
      {seasonal && !loading && (
        <>
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.brand }]}>{MONTHS[currentMonth - 1]} Gardening Tasks</Text>
            {seasonal.tasks?.map((task, i) => (
              <View key={i} style={s.taskRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.accent} />
                <Text style={[s.taskText, { color: theme.textSecondary }]}>{task}</Text>
              </View>
            ))}
          </View>

          {seasonal.sow?.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.brand }]}>Sow Now</Text>
              <View style={s.chipRow}>
                {seasonal.sow.map(p => (
                  <View key={p.id} style={[s.chip, { backgroundColor: theme.card, borderColor: theme.accent }]}>
                    <Text style={[s.chipText, { color: theme.text }]}>{p.emoji} {p.common_name}</Text>
                    <Text style={[s.chipSub, { color: theme.textMuted }]}>{p.action === "sow_indoors" ? "indoors" : "outside"}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {seasonal.harvest?.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.brand }]}>Ready to Harvest</Text>
              <View style={s.chipRow}>
                {seasonal.harvest.map(p => (
                  <View key={p.id} style={[s.chip, { backgroundColor: theme.card, borderColor: "#f9a825" }]}>
                    <Text style={[s.chipText, { color: theme.text }]}>{p.emoji} {p.common_name}</Text>
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

function WStat({ icon, label, value }) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.8)" />
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: t.bg },
  searchRow:    { flexDirection: "row", margin: 16, gap: 8 },
  input:        { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1 },
  searchBtn:    { borderRadius: 10, padding: 12, justifyContent: "center" },
  errorText:    { margin: 16, textAlign: "center" },
  weatherCard:  { margin: 16, borderRadius: 16, padding: 20, alignItems: "center" },
  locationText: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 4 },
  weatherEmoji: { fontSize: 52, marginVertical: 4 },
  tempText:     { color: "#fff", fontSize: 48, fontWeight: "700" },
  conditionText:{ color: "rgba(255,255,255,0.9)", fontSize: 16, marginTop: 2 },
  feelsLike:    { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  statsRow:     { flexDirection: "row", marginTop: 16, gap: 20 },
  frostCard:    { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, marginHorizontal: 16, marginBottom: 8, padding: 12 },
  frostText:    { fontSize: 13, flex: 1 },
  section:      { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  taskRow:      { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  taskText:     { fontSize: 14, flex: 1, lineHeight: 20 },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:         { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText:     { fontSize: 13 },
  chipSub:      { fontSize: 10, marginTop: 1 },
  dayCard:      { borderRadius: 12, padding: 12, alignItems: "center", marginRight: 8, minWidth: 65, shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  dayLabel:     { fontSize: 11, marginBottom: 4 },
  dayEmoji:     { fontSize: 22, marginVertical: 4 },
  dayMax:       { fontSize: 14, fontWeight: "700" },
  dayMin:       { fontSize: 12 },
});
