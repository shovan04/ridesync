# RideSync 🏍️

A real-time group ride coordination platform with AI-powered crash detection. RideSync lets riders sync live GPS positions, plan routes with stops, and automatically detect crashes using onboard sensor data.

---

## Features

- **Live Map Tracking** — Real-time GPS positions for all riders on an interactive Leaflet map, broadcast over Socket.IO every 5 seconds
- **Group Ride Sessions** — Marshals create rides with a 6-digit code; riders join instantly and see everyone's position
- **Route Planning** — Pick start/end points and intermediate stops (fuel, food, rest, tea) on an interactive map picker
- **Role System** — Marshals (👑) lead rides and control start; Riders (🚴) follow and sync automatically
- **AI Crash Detection** — A Random Forest model analyzes accelerometer, gyroscope, and speed data in a 120-sample sliding window to detect crashes in real time
- **SOS Button** — One-tap emergency alert with a cancel window before notifying the group
- **Off-Route Alerts** — Dedicated screen for out-of-route warnings
- **PWA Support** — Installable as a progressive web app on mobile devices

---

## Architecture

```
ridesync/
├── frontend/          # React + TypeScript PWA (Vite)
│   └── src/
│       ├── screen/    # Page-level components (Map, Session, Profile, Alerts)
│       ├── components/# Reusable UI (Map modal, location picker, nav)
│       ├── services/  # API client & Socket.IO service
│       └── types/     # TypeScript interfaces
│
├── Python/            # FastAPI backends
│   ├── server.py      # Crash detection server (port 8000)
│   ├── gps_server.py  # GPS telemetry server with dashboard
│   ├── features.py    # Feature extraction for ML model
│   └── rf_model.pkl   # Trained Random Forest classifier
│
└── notebook/          # Jupyter notebook for model training & evaluation
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Maps | Leaflet, React-Leaflet, OpenStreetMap |
| Real-time | Socket.IO (client) |
| Backend | FastAPI (Python) |
| ML Model | Random Forest (scikit-learn / joblib) |
| PWA | vite-plugin-pwa, Workbox |

---

## Getting Started

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The app runs on `http://localhost:5173` by default.

### Python Backend (Crash Detection Server)

```bash
cd Python
pip install fastapi uvicorn numpy scikit-learn joblib
uvicorn server:app --reload --port 8000
```

### Python Backend (GPS Telemetry Server)

```bash
cd Python
uvicorn gps_server:app --reload --port 8001
```

The GPS server also serves a live `dashboard.html` at its root URL.

---

## How It Works

### Joining / Creating a Ride

1. Open the **Group** tab and create a ride by selecting start and end points on the map (add optional stops)
2. Share the generated 6-digit code with your group
3. Riders enter the code in the **Join Ride** section
4. The marshal taps **Start Ride** — all participants begin broadcasting GPS every 5 seconds

### Crash Detection

The crash detection server (`server.py`) receives sensor payloads at `POST /sensor`:

```json
{
  "ax": 0.1, "ay": 9.8, "az": 0.2,
  "gx": 0.0, "gy": 0.0, "gz": 0.0,
  "speed": 45.0,
  "timestamp": 1712345678.0
}
```

The server buffers the last 120 readings and extracts these features for the model:

- Mean, max, and std of combined acceleration magnitude
- Max absolute gyroscope value
- Mean, min, and max speed
- Mean acceleration over the last 10 samples

A crash is flagged when the model's rolling average probability exceeds **0.5** for 2+ consecutive windows, with a 10-second cooldown between alerts. Events are logged to `crash_log.txt`.

### Location & Telemetry

The GPS server (`gps_server.py`) tracks:
- Live coordinates via `POST /gps`
- Telemetry (speed, acceleration, confidence, ride phase) via `POST /telemetry`
- SOS state via `POST /cancel_sos` and `POST /reset_sos`

---

## Environment / Configuration

| Variable | Location | Default |
|---|---|---|
| Socket.IO server URL | `frontend/src/services/socketService.ts` | `https://bwz7qdx8-8090.inc1.devtunnels.ms` |
| Crash threshold | `Python/server.py` | `0.5` |
| Sensor window size | `Python/server.py` | `120 samples` |
| SOS cooldown | `Python/server.py` | `10 seconds` |

Update the Socket.IO URL to point to your backend before deploying.

---

## Building for Production

```bash
cd frontend
pnpm build
```

Output goes to `frontend/dist/`. Serve it with any static host or behind the FastAPI backend.
