from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

location = {"lat": 0.0, "lon": 0.0}
telemetry = {
    "speed": 0.0,
    "acc": 0.0,
    "gyro": 0.0,
    "confidence": 0.0,
    "status": "Normal",
    "phase": "Stationary"
}

sos_state = {
    "cancelled": False
}

# Mount static directory for resources if needed, but we'll just serve dashboard.html from root.
@app.get("/")
def get_dashboard():
    dashboard_path = os.path.join(os.path.dirname(__file__), "dashboard.html")
    if os.path.exists(dashboard_path):
        return FileResponse(dashboard_path)
    return {"message": "dashboard.html not found"}

@app.post("/gps")
def update_location(data: dict):
    global location
    location = {
        "lat": float(data.get("lat", 0)),
        "lon": float(data.get("lon", 0))
    }
    # Don't print the location every 0.05 seconds to avoid spamming the console
    return {"status": "ok"}

@app.get("/gps")
def get_location():
    return location

@app.post("/telemetry")
def update_telemetry(data: dict):
    global telemetry
    telemetry.update({
        "speed": float(data.get("speed", telemetry["speed"])),
        "acc": float(data.get("acc", telemetry["acc"])),
        "gyro": float(data.get("gyro", telemetry.get("gyro", 0.0))),
        "confidence": float(data.get("confidence", telemetry["confidence"])),
        "phase": data.get("phase", telemetry["phase"])
    })
    
    incoming_status = data.get("status", telemetry["status"])
    if incoming_status == "CRASH_DETECTED":
        telemetry["status"] = "CRASH_DETECTED"
    elif telemetry["status"] != "CRASH_DETECTED":
        telemetry["status"] = incoming_status

    return {"status": "ok"}

@app.get("/telemetry")
def get_telemetry():
    return telemetry

@app.post("/cancel_sos")
def cancel_sos():
    global sos_state, telemetry
    sos_state["cancelled"] = True
    if telemetry["status"] == "CRASH_DETECTED":
        telemetry["status"] = "Normal"
    return {"status": "cancelled"}

@app.post("/reset_sos")
def reset_sos():
    global sos_state, telemetry
    sos_state["cancelled"] = False
    if telemetry["status"] == "CRASH_DETECTED":
        telemetry["status"] = "Normal"
    return {"status": "reset"}

@app.get("/sos_status")
def sos_status():
    return sos_state