@echo off
echo 🚀 Starting Map Simulation Services...

REM Start GPS & Telemetry Dashboard server (port 9000)
start "Map Dashboard Server" cmd /k uvicorn gps_server:app --reload --port 9000

REM Start Main Crash Sensor Server (port 8000)
start "Crash Sensor Server" cmd /k uvicorn server:app --reload --host 0.0.0.0 --port 8000

REM Wait a bit to ensure servers are up
timeout /t 3 >nul

REM Open the new Map Dashboard in browser
start http://127.0.0.1:9000/

REM Start our updated Simulator 3
start "Simulator" cmd /k python .\simulator3.py

echo ✅ All servers and simulation started!
