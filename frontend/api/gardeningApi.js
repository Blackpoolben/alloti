import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://localhost:5000"; // update for production

async function getBaseUrl() {
  try {
    const stored = await AsyncStorage.getItem("api_base_url");
    return stored || API_BASE;
  } catch {
    return API_BASE;
  }
}

async function request(path, options = {}) {
  const base = await getBaseUrl();
  const url = `${base}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.error || `Request failed: ${response.status}`);
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export async function getWeather(postcode) {
  const clean = postcode.replace(/\s+/g, "").toUpperCase();
  return request(`/weather/${clean}`);
}

// ---------------------------------------------------------------------------
// Plant identification
// ---------------------------------------------------------------------------

export async function identifyPlant(imageUri, lat = null, lon = null) {
  const base = await getBaseUrl();
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "plant.jpg",
  });
  if (lat !== null) formData.append("lat", String(lat));
  if (lon !== null) formData.append("lon", String(lon));

  const response = await fetch(`${base}/identify`, {
    method: "POST",
    body: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  const json = await response.json();
  if (!json.ok) throw new Error(json.error || "Identification failed");
  return json.data;
}

// ---------------------------------------------------------------------------
// Plant database
// ---------------------------------------------------------------------------

export async function getPlants(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/plants${qs ? `?${qs}` : ""}`);
}

export async function getPlantDetail(plantId) {
  return request(`/plants/${plantId}`);
}

export async function getPlantCompanions(plantId) {
  return request(`/plants/${plantId}/companions`);
}

// ---------------------------------------------------------------------------
// Seasonal guidance
// ---------------------------------------------------------------------------

export async function getSeasonalGuidance(month = null, postcode = "SW1A") {
  const m = month || new Date().getMonth() + 1;
  return request(`/seasonal?month=${m}&postcode=${postcode}`);
}

// ---------------------------------------------------------------------------
// My garden
// ---------------------------------------------------------------------------

export async function getGarden() {
  return request("/garden");
}

export async function addToGarden(entry) {
  return request("/garden", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export async function updateGardenEntry(id, updates) {
  return request(`/garden/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function removeFromGarden(id) {
  return request(`/garden/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Identification history
// ---------------------------------------------------------------------------

export async function getHistory(limit = 50) {
  return request(`/history?limit=${limit}`);
}

export async function deleteHistoryEntry(id) {
  return request(`/history/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings() {
  return request("/settings");
}

export async function saveSettings(settings) {
  return request("/settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}
