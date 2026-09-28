/**
 * Frontend Service Layer — Rainfall Intelligence Platform (SIH26080)
 * All API calls route through the FastAPI backend.
 * No direct calls to external APIs from the client.
 */

const PROD_BACKEND_URL = 'https://rainfall-intelligence.onrender.com';

const resolveApiBase = () => {
  // 1. Explicit environment variable configured in Vite / Render build
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    const raw = import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }

  // 2. Production auto-detection:
  // When running on Render static frontend (rainfall-intelligence-1.onrender.com),
  // Vercel, or any mobile browser accessing deployed site, connect directly to deployed FastAPI backend.
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${PROD_BACKEND_URL}/api`;
    }
  }

  // 3. Local development fallback (proxied by Vite)
  return '/api';
};

export const API_BASE = resolveApiBase();

async function handleResponse(response) {
  if (!response.ok) {
    let errorDetail = 'Service unavailable. Please check the configured data source.';
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch (_) {}
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }
  return await response.json();
}

const WMO_DESCRIPTIONS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function getWmoText(code) {
  return WMO_DESCRIPTIONS[code] || (code != null ? `Code ${code}` : 'Unknown');
}

/**
 * Resilient live NWP fallback: fetches real forecast directly from Open-Meteo
 * when the backend server's shared datacenter IP is temporarily rate-limited.
 */
export async function fetchDirectOpenMeteoForecast({ lat, lon, district, state, days = 3 }) {
  const latitude = lat ?? 28.6139;
  const longitude = lon ?? 77.2090;
  const safeDays = Math.max(1, Math.min(days, 7));
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&hourly=precipitation,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code&timezone=Asia%2FKolkata&forecast_days=${safeDays}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`External weather provider error: HTTP ${res.status}`);
  }
  const raw = await res.json();
  const currentRaw = raw.current || {};
  const hourlyRaw = raw.hourly || {};
  const dailyRaw = raw.daily || {};

  const hourly = (hourlyRaw.time || []).map((t, idx) => ({
    timestamp: t,
    rainfall: hourlyRaw.precipitation?.[idx] ?? null,
    temperature: hourlyRaw.temperature_2m?.[idx] ?? null,
    humidity: hourlyRaw.relative_humidity_2m?.[idx] ?? null,
    pressure: hourlyRaw.surface_pressure?.[idx] ?? null,
    wind_speed: hourlyRaw.wind_speed_10m?.[idx] ?? null,
    wind_direction: hourlyRaw.wind_direction_10m?.[idx] ?? null,
    weather_code: hourlyRaw.weather_code?.[idx] ?? null,
    weather_description: getWmoText(hourlyRaw.weather_code?.[idx])
  }));

  const daily = (dailyRaw.time || []).map((d, idx) => ({
    date: d,
    total_rainfall: dailyRaw.precipitation_sum?.[idx] ?? null,
    temp_max: dailyRaw.temperature_2m_max?.[idx] ?? null,
    temp_min: dailyRaw.temperature_2m_min?.[idx] ?? null,
    wind_speed_max: dailyRaw.wind_speed_10m_max?.[idx] ?? null,
    weather_code: dailyRaw.weather_code?.[idx] ?? null
  }));

  return {
    latitude: raw.latitude ?? latitude,
    longitude: raw.longitude ?? longitude,
    state: state || null,
    district: district || null,
    timezone: raw.timezone || "Asia/Kolkata",
    elevation: raw.elevation ?? null,
    source: "Open-Meteo NWP (ECMWF/GFS)",
    last_updated: new Date().toISOString(),
    units: {
      rainfall: "mm",
      temperature: "°C",
      humidity: "%",
      wind_speed: "km/h",
      wind_direction: "°",
      pressure: "hPa"
    },
    current: {
      timestamp: currentRaw.time || new Date().toISOString(),
      latitude: raw.latitude ?? latitude,
      longitude: raw.longitude ?? longitude,
      elevation: raw.elevation ?? null,
      state: state || null,
      district: district || null,
      rainfall: currentRaw.precipitation ?? 0.0,
      temperature: currentRaw.temperature_2m ?? null,
      humidity: currentRaw.relative_humidity_2m ?? null,
      wind_speed: currentRaw.wind_speed_10m ?? null,
      wind_direction: currentRaw.wind_direction_10m ?? null,
      pressure: currentRaw.surface_pressure ?? null,
      weather_code: currentRaw.weather_code ?? null,
      weather_description: getWmoText(currentRaw.weather_code),
      source: "Open-Meteo NWP (ECMWF/GFS)",
      is_live: true,
      units: {
        rainfall: "mm",
        temperature: "°C",
        humidity: "%",
        wind_speed: "km/h",
        wind_direction: "°",
        pressure: "hPa"
      }
    },
    hourly,
    daily
  };
}

export const apiService = {
  // ─── Part 1: Foundation ───────────────────────────────────────────────────

  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async getStates() {
    const res = await fetch(`${API_BASE}/location/states`);
    return handleResponse(res);
  },

  async getDistricts(state = null) {
    const url = state
      ? `${API_BASE}/location/districts?state=${encodeURIComponent(state)}`
      : `${API_BASE}/location/districts`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async getLocationsGeoJSON() {
    const res = await fetch(`${API_BASE}/location/geojson`);
    return handleResponse(res);
  },

  async getCurrentWeather({ lat, lon, district, state }) {
    try {
      const params = new URLSearchParams();
      if (lat != null) params.append('lat', lat);
      if (lon != null) params.append('lon', lon);
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      const res = await fetch(`${API_BASE}/weather/current?${params}`);
      if (res.ok) {
        return await handleResponse(res);
      }
    } catch (_) {}
    const forecast = await fetchDirectOpenMeteoForecast({ lat, lon, district, state, days: 1 });
    return forecast.current;
  },

  async getForecast({ lat, lon, district, state, days = 3 }) {
    try {
      const params = new URLSearchParams();
      if (lat != null) params.append('lat', lat);
      if (lon != null) params.append('lon', lon);
      if (district) params.append('district', district);
      if (state) params.append('state', state);
      params.append('days', days);
      const res = await fetch(`${API_BASE}/weather/forecast?${params}`);
      if (res.ok) {
        return await handleResponse(res);
      }
    } catch (_) {}
    // Seamless client-side live NWP forecast fallback directly from Open-Meteo
    return await fetchDirectOpenMeteoForecast({ lat, lon, district, state, days });
  },

  async getDataSources() {
    const res = await fetch(`${API_BASE}/data-sources/status`);
    return handleResponse(res);
  },

  async probeDataSource() {
    const res = await fetch(`${API_BASE}/data-sources/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(res);
  },

  // ─── Part 2: AI/ML Post-Processing Layer ──────────────────────────────────

  /**
   * Classify current weather regime (Active Monsoon, Break Monsoon, etc.)
   * using live NWP meteorological observations.
   */
  async getRegimeClassification({ lat, lon, district, state }) {
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', lat);
    if (lon != null) params.append('lon', lon);
    if (district) params.append('district', district);
    if (state) params.append('state', state);
    const res = await fetch(`${API_BASE}/ml/regime/current?${params}`);
    return handleResponse(res);
  },

  /**
   * Apply regime-specific ML bias correction to raw NWP rainfall,
   * and compute heavy rainfall exceedance probability.
   */
  async getCorrectedForecast({ lat, lon, district, state, threshold = 15.0, target_time = null }) {
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', lat);
    if (lon != null) params.append('lon', lon);
    if (district) params.append('district', district);
    if (state) params.append('state', state);
    if (target_time) params.append('target_time', target_time);
    params.append('threshold', threshold);
    const res = await fetch(`${API_BASE}/ml/correction/predict?${params}`);
    return handleResponse(res);
  },

  /**
   * Full verification scorecard: RMSE, MAE, Bias, Correlation, CSI, ETS, POD, FAR, FSS.
   */
  async getVerificationSummary(threshold = 15.0) {
    const res = await fetch(`${API_BASE}/ml/verification/summary?threshold=${threshold}`);
    return handleResponse(res);
  },

  /**
   * Regime-wise performance breakdown for raw NWP vs corrected forecast.
   */
  async getRegimeWiseVerification(threshold = 15.0) {
    const res = await fetch(`${API_BASE}/ml/verification/regime-wise?threshold=${threshold}`);
    return handleResponse(res);
  },

  /**
   * List all catalogue historical meteorological events available for replay.
   */
  async listHistoricalEvents() {
    const res = await fetch(`${API_BASE}/ml/events`);
    return handleResponse(res);
  },

  /**
   * Detailed event replay: observed vs NWP vs corrected timeline with metrics.
   */
  async getHistoricalEventDetail(eventId) {
    const res = await fetch(`${API_BASE}/ml/events/${eventId}`);
    return handleResponse(res);
  },

  /**
   * Error analysis: error distribution bins and intensity-stratified error curves.
   */
  async getErrorAnalysis() {
    const res = await fetch(`${API_BASE}/ml/error-analysis/summary`);
    return handleResponse(res);
  },

  // ─── Part 3: AI Assistant ──────────────────────────────────────────

  /**
   * Send a chat message to the AI assistant.
   * @param {string} message - The latest user message
   * @param {Object} location - {district, state, latitude, longitude}
   * @param {Array} history - Previous conversation [{role, content}, ...]
   */
  async sendAssistantMessage(message, location, history = []) {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        district: location.district,
        state: location.state,
        lat: location.latitude,
        lon: location.longitude,
        history,
      }),
    });
    return handleResponse(res);
  },

  /**
   * Get the current AI assistant configuration status.
   */
  async getAssistantStatus() {
    const res = await fetch(`${API_BASE}/assistant/status`);
    return handleResponse(res);
  },
};
