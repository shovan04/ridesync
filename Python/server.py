from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from collections import deque
import joblib
import time
import datetime
from features import extract_features

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WINDOW_SIZE = 120
CRASH_THRESHOLD = 0.5
COOLDOWN = 10

model = joblib.load("rf_model.pkl")
buffer = deque(maxlen=WINDOW_SIZE)

last_crash_time = 0
latest_location = {"lat": 0.0, "lon": 0.0}

@app.post("/location")
def update_location(data: dict):
    global latest_location
    latest_location = {
        "lat": float(data.get("lat", 0)),
        "lon": float(data.get("lon", 0))
    }
    print(f"📍 Location Updated: {latest_location}")
    return {"status": "location updated"}

@app.get("/location")
def get_location():
    return latest_location

class SensorData(BaseModel):
    ax: float
    ay: float
    az: float
    gx: float
    gy: float
    gz: float
    speed: float
    timestamp: float

@app.post("/sensor")
def sensor(data: SensorData):
    global last_crash_time

    try:
        buffer.append([
            data.ax, data.ay, data.az,
            data.gx, data.gy, data.gz,
            data.speed
        ])

        if len(buffer) < WINDOW_SIZE:
            return {"status": "collecting"}

        window = np.array(buffer)
        features = extract_features(window)
        prob = model.predict_proba([features])[0][1]
        acc = np.sqrt(window[:,0]**2 + window[:,1]**2 + window[:,2]**2)
        if np.max(acc) > 40:
            prob += 0.2

        prob = float(min(prob, 1.0))
        if not hasattr(sensor, "history"):
            sensor.history = []

        sensor.history.append(prob)
        sensor.history = sensor.history[-5:]
        avg_prob = float(sum(sensor.history) / len(sensor.history))

        if not hasattr(sensor, "trigger_count"):
            sensor.trigger_count = 0

        if avg_prob > CRASH_THRESHOLD:
            sensor.trigger_count += 1
        else:
            sensor.trigger_count = 0

        current_time = float(time.time())
        crash_detected = (
            sensor.trigger_count >= 2 and
            (current_time - last_crash_time > COOLDOWN)
        )

        if crash_detected:
            last_crash_time = current_time
            event_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            confidence = float(min(1.0, avg_prob + 0.2))
            log_message = f"""
CRASH DETECTED!
Time: {event_time}
Confidence: {round(confidence, 3)}
-----------------------------------
"""

            print("\033[91m" + log_message + "\033[0m")

            with open("crash_log.txt", "a", encoding="utf-8") as f:
                f.write(log_message)

            return {
                "event": "CRASH_DETECTED",
                "confidence": confidence,
                "timestamp": current_time
            }
        return {
            "status": "monitoring",
            "confidence": float(avg_prob)
        }

    except Exception as e:
        print("SERVER ERROR:", e)
        return {"error": str(e)}

@app.get("/")
def home():
    return {"status": "Crash Detection Server Running 🚀"}