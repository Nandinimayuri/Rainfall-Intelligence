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
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', lat);
    if (lon != null) params.append('lon', lon);
    if (district) params.append('district', district);
    if (state) params.append('state', state);
    const res = await fetch(`${API_BASE}/weather/current?${params}`);
    return handleResponse(res);
  },

  async getForecast({ lat, lon, district, state, days = 3 }) {
    const params = new URLSearchParams();
    if (lat != null) params.append('lat', lat);
    if (lon != null) params.append('lon', lon);
    if (district) params.append('district', district);
    if (state) params.append('state', state);
    params.append('days', days);
    const res = await fetch(`${API_BASE}/weather/forecast?${params}`);
    return handleResponse(res);
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
