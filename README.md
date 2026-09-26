# Rainfall Intelligence
### Regime-Aware Rainfall Forecast Intelligence Platform
**Smart India Hackathon Problem Statement: SIH26080**  
*Part 1: Live Meteorological Data Layer & Application Foundation*  
*Developed by Nandini Mayuri*

---

## 1. Project Purpose & Background

Rainfall forecast errors across India vary significantly across distinct weather regimes:
- **Active Monsoon:** Intense synoptic moisture convergence with widespread heavy rainfall.
- **Break Monsoon:** Rainfall concentration shifts toward the Himalayan foothills; central India experiences dry spells.
- **Monsoon Lows / Depressions:** Severe, localized mesoscale convective storms.
- **Orographic Rainfall:** Dramatic windward amplification versus leeward rain shadows (e.g., Western Ghats and Northeast India).
- **Coastal Rainfall:** Maritime diurnal breeze dynamics and squalls.
- **Western Disturbances:** Non-monsoonal extratropical frontal systems affecting North India.

Standard Numerical Weather Prediction (NWP) models (e.g., ECMWF, GFS) frequently suffer from systematic, regime-dependent biases. While Part 2 will implement AI/ML regime classification and bias-correction, **Part 1 establishes the real-data foundation, database, geospatial mapping, and backend service architecture.**

---

## 2. Part 1 Scope & Features

- **Strict Real Data Architecture:** 100% live Numerical Weather Prediction (NWP) forecasts from Open-Meteo (ECMWF IFS / GFS). **Zero synthetic or mock weather data.**
- **No Fake Fallback Data:** If the external API is unreachable or fails, the interface gracefully displays a transparent service message: *"Live data currently unavailable. Please check the configured data source."* with a working Retry button.
- **Unified Normalization Layer:** Standardized data model enforcing consistent meteorology units:
  - Rainfall / Precipitation: `mm`
  - Temperature: `°C`
  - Relative Humidity: `%`
  - Surface Pressure: `hPa`
  - Wind Speed: `km/h`
- **National Administrative Registry:** Comprehensive database of 164+ verified Indian districts across all States and Union Territories with precise latitude and longitude coordinates.
- **Interactive Geospatial Map:** Leaflet map centered on India with verified district markers, spatial zoom/pan/reset controls, and instant live NWP observation inspection.
- **Clean Five-View Navigation:**
  1. **Dashboard:** Live status badge, district selector, real-time weather metrics, multi-day rainfall chart, and spatial preview.
  2. **Live Forecast:** Dedicated hourly NWP prediction table with date filtering and rain-only filters.
  3. **District Map:** Full-height interactive India map with live district telemetry inspection panel.
  4. **Data Sources:** Live registry of connected data sources, metadata, and an active roundtrip latency probe.
  5. **About:** Hackathon problem scope, architecture roadmap, and developer attribution.

---

## 3. Technology Stack

- **Frontend:**
  - React 19 + Vite
  - Tailwind CSS 3.4
  - Leaflet + OpenStreetMap & CARTO Cartography
  - Recharts for meteorological visualization
  - Lucide React icons
- **Backend:**
  - Python 3.13 + FastAPI
  - SQLAlchemy ORM
  - SQLite (Local development, architected for zero-downtime PostgreSQL migration)
  - httpx (asynchronous HTTP client for live NWP queries)
  - Pydantic v2 data validation schemas
- **Testing:**
  - Pytest + FastAPI TestClient

---

## 4. Project Structure

```
SIH_Weather/
├── .env.example              # Environment variables template
├── .env                      # Local configuration file
├── README.md                 # Project documentation
├── data/
│   └── india_districts.json  # Verified Indian administrative district coordinates
├── tests/
│   ├── conftest.py           # Pytest fixtures and DB initialization
│   ├── test_health.py        # System and database health check tests
│   ├── test_location.py      # State and district registry tests
│   ├── test_weather.py       # Live NWP API integration and validation tests
│   └── test_data_sources.py  # Data sources status and live probe tests
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint, lifespan, and CORS
│   │   ├── config/
│   │   │   └── settings.py   # Pydantic BaseSettings configuration
│   │   ├── database/
│   │   │   ├── session.py    # SQLAlchemy engine and session factory
│   │   │   ├── init_db.py    # Database schema creation and seeding
│   │   │   └── india_districts_data.py # Authentic coordinates dataset
│   │   ├── models/
│   │   │   ├── location.py   # Location table (State, District, Lat, Lon)
│   │   │   ├── data_source.py # Data sources registry table
│   │   │   └── forecast_record.py # Weather forecasts historical store
│   │   ├── schemas/
│   │   │   ├── weather.py    # Normalized meteorology data models
│   │   │   ├── location.py   # Location request/response schemas
│   │   │   ├── data_source.py# Data source status schemas
│   │   │   └── health.py     # System health schema
│   │   ├── services/
│   │   │   ├── weather_service.py # Live NWP retrieval and normalization
│   │   │   ├── location_service.py # Administrative geography queries
│   │   │   └── data_source_service.py # Live latency probe service
│   │   └── api/
│   │       ├── api.py        # Combined router
│   │       └── endpoints/
│   │           ├── health.py
│   │           ├── weather.py
│   │           ├── location.py
│   │           └── data_sources.py
└── frontend/
    ├── package.json
    ├── vite.config.js        # Vite config with backend /api proxy
    ├── tailwind.config.js    # Custom navy & meteorological palette
    └── src/
        ├── App.jsx           # Main application state and page switcher
        ├── main.jsx          # React DOM entry point
        ├── components/
        │   ├── LiveStatusBadge.jsx
        │   ├── LocationSelector.jsx
        │   ├── WeatherMetricCard.jsx
        │   ├── ErrorMessage.jsx
        │   └── SkeletonLoader.jsx
        ├── layouts/
        │   ├── MainLayout.jsx
        │   ├── Sidebar.jsx
        │   └── TopHeader.jsx
        ├── pages/
        │   ├── DashboardPage.jsx
        │   ├── LiveForecastPage.jsx
        │   ├── DistrictMapPage.jsx
        │   ├── DataSourcesPage.jsx
        │   └── AboutPage.jsx
        ├── services/
        │   └── api.js        # Frontend API service layer
        ├── map/
        │   └── IndiaMap.jsx  # Interactive Leaflet component
        ├── charts/
        │   └── ForecastChart.jsx # Recharts dual-axis forecast chart
        └── styles/
            └── index.css     # Base Tailwind and Leaflet CSS
```

---

## 5. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Runtime environment (`development` / `production`) |
| `APP_NAME` | `Rainfall Intelligence` | Application title |
| `APP_SUBTITLE` | `Regime-Aware Rainfall Forecast Intelligence Platform` | Application subtitle |
| `HOST` | `127.0.0.1` | Backend binding address |
| `PORT` | `8000` | Backend port |
| `DATABASE_URL` | `sqlite:///./rainfall_intelligence.db` | SQLAlchemy database connection URI |
| `OPEN_METEO_BASE_URL`| `https://api.open-meteo.com/v1` | Live NWP forecast API endpoint |
| `WEATHER_API_KEY` | *(empty)* | Optional commercial API key (not required for standard Open-Meteo) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins |

---

## 6. How to Run

### A. Run Backend
1. Open a terminal in the root directory:
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`.  
- Interactive API Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### B. Run Frontend
1. Open a new terminal in the frontend directory:
```bash
cd frontend
npm run dev
```
The Vite development server will open at `http://localhost:5173`.

---

## 7. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System, database, and NWP connectivity health check |
| `GET` | `/api/weather/current` | Real-time current meteorological observations |
| `GET` | `/api/weather/forecast` | Multi-day hourly and daily NWP model rainfall predictions |
| `GET` | `/api/location/states` | List of all registered Indian States and UTs |
| `GET` | `/api/location/districts` | List of districts (supports `?state=...` filter) |
| `GET` | `/api/location/geojson` | GeoJSON FeatureCollection of district coordinates for Leaflet |
| `GET` | `/api/location/{district}` | Geographic coordinate lookup for a specific district |
| `GET` | `/api/data-sources/status` | Current registry and operational status of all data sources |
| `POST` | `/api/data-sources/check` | Triggers a live latency probe to the NWP meteorological endpoint |

---

## 8. Running Automated Tests

Run the test suite from the repository root:
```bash
python -m pytest tests/ -v
```
All tests validate real network connectivity, schema compliance, unit consistency, and geographic resolution without using mock weather figures.

---

## 9. Next Steps (Part 2 & Part 3)

The data model and API structure are intentionally pre-configured for subsequent hackathon phases:
- **Part 2:** Integrating ML Regime Classification (Active, Break, Lows, Orographic, Coastal, WD), regime-aware bias-correction algorithms, heavy rainfall probability modelling, and spatial verification metrics (RMSE, ETS, CSI, POD, FAR, FSS).
- **Part 3:** Domain-specific conversational intelligence assistant and meteorological feature attribution.
