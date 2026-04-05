import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"

import io
import base64
import requests
import time
import numpy as np
import smtplib
import datetime
import matplotlib
matplotlib.use("Agg")                          
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage

CRASH_SERVER_URL = "http://127.0.0.1:8000/sensor"
GPS_URL          = "http://127.0.0.1:9000/gps"
GEOCODE_URL      = "https://nominatim.openstreetmap.org/reverse"

session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=100, pool_maxsize=100)
session.mount('http://', adapter)
session.mount('https://', adapter)

EMAIL_SENDER   = "sayantanpatraodob@gmail.com"
EMAIL_PASSWORD = "oocwrjnxhmpxbody"
EMAIL_RECEIVER = "somhritastudy@gmail.com"

PHASE_COLORS = {
    "Pre-Impact" : "#ffaa00",
    "Impact"     : "#ff3333",
    "Sliding"    : "#aa66ff",
}


def beep():
    try:
        import winsound
        for _ in range(5):
            winsound.Beep(2500, 300)
            time.sleep(0.05)
    except ImportError:
        if os.system("which play > /dev/null 2>&1") == 0:
            for _ in range(5):
                os.system("play -nq -t alsa synth 0.3 sine 2500 2>/dev/null")
                time.sleep(0.1)
        else:
            for _ in range(5):
                print("\a", end="", flush=True)
                time.sleep(0.3)

def get_location():
    try:
        data = session.get(GPS_URL, timeout=2).json()
        lat  = data.get("lat") or data.get("latitude") or 0
        lon  = data.get("lon") or data.get("longitude") or 0
        return {"lat": float(lat), "lon": float(lon)}
    except Exception as e:
        print(f"\n⚠️  GPS error: {e}")
        return {"lat": 0.0, "lon": 0.0}

def get_address(lat, lon):
    try:
        res  = session.get(
            GEOCODE_URL,
            params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
            headers={"User-Agent": "CrashDetectionSystem/1.0"},
            timeout=5,
        ).json()
        addr    = res.get("address", {})
        city    = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county") or "Unknown"
        state   = addr.get("state",   "Unknown")
        country = addr.get("country", "Unknown")
        return city, state, country
    except Exception as e:
        print(f"\n⚠️  Geocode error: {e}")
        return "Unknown", "Unknown", "Unknown"

def build_graph_png(timeline):
    if not timeline:
        return None

    times  = [p["t"]          for p in timeline]
    speeds = [p["speed"]      for p in timeline]
    accs   = [p["acc"]        for p in timeline]
    gxs    = [abs(p["gx"])    for p in timeline]
    phases = [p["phase"]      for p in timeline]

    fig, ax1 = plt.subplots(figsize=(7.2, 3.2), dpi=130)
    fig.patch.set_facecolor("#141414")
    ax1.set_facecolor("#141414")

    phase_list = ["Pre-Impact", "Impact", "Sliding"]
    shade      = {"Pre-Impact": "#ffaa0012", "Impact": "#ff333318", "Sliding": "#aa66ff12"}
    prev_phase, seg_start = phases[0], times[0]
    for i in range(1, len(phases)):
        if phases[i] != prev_phase or i == len(phases) - 1:
            seg_end = times[i]
            ax1.axvspan(seg_start, seg_end,
                        color=shade[prev_phase], linewidth=0)
            mid = (seg_start + seg_end) / 2
            ax1.text(mid, ax1.get_ylim()[1] if ax1.get_ylim()[1] != 1 else 100,
                     prev_phase,
                     color=PHASE_COLORS[prev_phase],
                     fontsize=7.5, ha="center", va="top",
                     fontfamily="monospace")
            seg_start = times[i]
            prev_phase = phases[i]

    prev = phases[0]
    for i, ph in enumerate(phases):
        if ph != prev:
            ax1.axvline(times[i], color="#444444", linewidth=1,
                        linestyle="--", dashes=(4, 3))
            prev = ph

    lw = 1.8
    l1, = ax1.plot(times, speeds, color="#ff8c00", linewidth=lw,
                   label="Speed (km/h)", zorder=3)
    l2, = ax1.plot(times, accs,   color="#ff3333", linewidth=lw,
                   label="Total Accel (m/s²)", zorder=3)
    l3, = ax1.plot(times, gxs,    color="#aa66ff", linewidth=1.4,
                   label="|Gyro X| (°/s)", zorder=3, linestyle="--")

    for spine in ax1.spines.values():
        spine.set_color("#333333")

    ax1.set_xlabel("Time from crash start (s)",
                   color="#666", fontsize=8, fontfamily="monospace")
    ax1.set_ylabel("Value", color="#666", fontsize=8, fontfamily="monospace")
    ax1.tick_params(colors="#555", labelsize=7.5)
    ax1.xaxis.label.set_color("#666")
    ax1.yaxis.label.set_color("#666")
    for tl in ax1.get_xticklabels() + ax1.get_yticklabels():
        tl.set_color("#555")
        tl.set_fontfamily("monospace")

    ax1.grid(True, color="#222222", linewidth=0.6, linestyle="-")
    ax1.set_axisbelow(True)

    leg = ax1.legend(
        handles=[l1, l2, l3],
        loc="upper right",
        fontsize=7.5,
        facecolor="#1e1e1e",
        edgecolor="#333",
        labelcolor="white",
        framealpha=0.9,
    )

    y_top = ax1.get_ylim()[1]
    prev_phase, seg_start = phases[0], times[0]
    for i in range(1, len(phases)):
        if phases[i] != prev_phase or i == len(phases) - 1:
            seg_end = times[i]
            mid = (seg_start + seg_end) / 2
            ax1.text(mid, y_top * 0.96,
                     prev_phase,
                     color=PHASE_COLORS[prev_phase],
                     fontsize=7.5, ha="center", va="top",
                     fontfamily="monospace", fontweight="bold")
            seg_start = times[i]
            prev_phase = phases[i]
    ax1.text((seg_start + times[-1]) / 2, y_top * 0.96,
             prev_phase,
             color=PHASE_COLORS[prev_phase],
             fontsize=7.5, ha="center", va="top",
             fontfamily="monospace", fontweight="bold")

    plt.tight_layout(pad=0.6)

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=130,
                facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()


def build_html_email(conf, loc, impact_speed, acc_data, crash_time, timeline=None):
    lat, lon = loc["lat"], loc["lon"]
    maps_url = f"https://www.google.com/maps?q={lat},{lon}"
    city, state, country = get_address(lat, lon)
    conf_pct   = int(conf * 100)
    conf_color = "#ff2d2d" if conf_pct > 80 else "#ff8c00" if conf_pct > 60 else "#ffd700"
    date_str   = crash_time.strftime("%A, %B %d, %Y")
    time_str   = crash_time.strftime("%I:%M:%S %p")
    total_acc  = np.sqrt(acc_data["ax"]**2 + acc_data["ay"]**2 + acc_data["az"]**2)
    phase_data = {"Pre-Impact": [], "Impact": [], "Sliding": []}
    if timeline:
        for p in timeline:
            if p["phase"] in phase_data:
                phase_data[p["phase"]].append(p["speed"])

    def phase_row(icon, name, color):
        sp = phase_data[name]
        if not sp:
            return ""
        entry, exit_ = sp[0], sp[-1]
        drop = entry - exit_
        return f"""
        <tr>
          <td style="padding:9px 0;font-size:15px;">{icon}</td>
          <td style="padding:9px 10px;">
            <span style="color:{color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">{name}</span>
          </td>
          <td style="padding:9px 6px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:14px;font-weight:700;">{entry:.1f} km/h</p>
            <p style="margin:0;color:#666;font-size:10px;">entry</p>
          </td>
          <td style="padding:9px 6px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:14px;font-weight:700;">{exit_:.1f} km/h</p>
            <p style="margin:0;color:#666;font-size:10px;">exit</p>
          </td>
          <td style="padding:9px 0;text-align:right;">
            <span style="background:#2a0000;color:#ff4444;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;">▼ {drop:.1f}</span>
          </td>
        </tr>"""

    timeline_rows = (
        phase_row("⚡", "Pre-Impact", "#ffaa00") +
        phase_row("💥", "Impact",     "#ff3333") +
        phase_row("🛝", "Sliding",    "#aa66ff")
    )

    graph_png = build_graph_png(timeline or [])
    graph_tag = (
        f'<img src="cid:crash_graph" '
        f'width="540" style="display:block;border-radius:8px;max-width:100%;" alt="Crash graph"/>'
        if graph_png else
        '<p style="color:#555;font-size:12px;">Graph unavailable.</p>'
    )

    html_str = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>SOS ALERT</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

  <tr><td style="background:linear-gradient(135deg,#cc0000,#6b0000);border-radius:16px 16px 0 0;padding:40px 40px 28px;text-align:center;">
    <div style="font-size:52px;line-height:1;">🚨</div>
    <h1 style="margin:12px 0 4px;color:#fff;font-size:32px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">SOS Alert</h1>
    <p style="margin:0;color:#ffaaaa;font-size:14px;letter-spacing:1px;">CRASH DETECTED — IMMEDIATE ATTENTION REQUIRED</p>
  </td></tr>

  <tr><td style="background:#1a0000;border-left:4px solid #ff0000;border-right:4px solid #ff0000;padding:14px 36px;text-align:center;">
    <p style="margin:0;color:#ff5555;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
      ⚠️ &nbsp;A vehicle crash has been automatically detected. The rider may be in danger.
    </p>
  </td></tr>

  <tr><td style="background:#111;border:1px solid #222;border-top:none;border-radius:0 0 16px 16px;padding:32px 36px;">

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr><td style="background:#1a1a1a;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">🕐 Incident Time</p>
        <p style="margin:0;color:#fff;font-size:24px;font-weight:700;">{time_str}</p>
        <p style="margin:2px 0 0;color:#aaa;font-size:13px;">{date_str}</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td width="48%" style="background:#1a1a1a;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
          <p style="margin:0 0 6px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Crash Confidence</p>
          <p style="margin:0;font-size:42px;font-weight:900;color:{conf_color};">{conf_pct}%</p>
          <div style="margin:10px auto 0;width:80%;background:#2a2a2a;border-radius:99px;height:6px;">
            <div style="width:{conf_pct}%;background:{conf_color};height:6px;border-radius:99px;"></div>
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#1a1a1a;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
          <p style="margin:0 0 6px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Speed at Impact</p>
          <p style="margin:0;font-size:42px;font-weight:900;color:#ff8c00;">{impact_speed:.1f}</p>
          <p style="margin:4px 0 0;color:#777;font-size:13px;">km/h</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr><td style="background:#1a1a1a;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 12px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">⏱️ Crash Phase Timeline</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr style="border-bottom:1px solid #2a2a2a;">
            <td colspan="2" style="color:#444;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:6px;">Phase</td>
            <td style="color:#444;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:6px;text-align:center;">Entry</td>
            <td style="color:#444;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:6px;text-align:center;">Exit</td>
            <td style="color:#444;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-bottom:6px;text-align:right;">Drop</td>
          </tr>
          {timeline_rows}
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr><td style="background:#1a1a1a;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 12px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">📈 Crash Data Graph — Speed / Accel / Gyro vs Time</p>
        {graph_tag}
        <p style="margin:10px 0 0;color:#444;font-size:10px;text-align:center;">
          Shaded regions = crash phases &nbsp;|&nbsp; X-axis = seconds from crash start
        </p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr><td style="background:#1a1a1a;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 12px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">📡 Sensor Data at Peak Impact</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr><td style="color:#aaa;padding:5px 0;">Accel X (ax)</td><td style="color:#fff;font-weight:700;text-align:right;">{acc_data['ax']:.2f} m/s²</td></tr>
          <tr><td style="color:#aaa;padding:5px 0;">Accel Y (ay)</td><td style="color:#fff;font-weight:700;text-align:right;">{acc_data['ay']:.2f} m/s²</td></tr>
          <tr><td style="color:#aaa;padding:5px 0;">Accel Z (az)</td><td style="color:#fff;font-weight:700;text-align:right;">{acc_data['az']:.2f} m/s²</td></tr>
          <tr><td style="color:#aaa;padding:5px 0;">Gyro X (gx)</td><td style="color:#fff;font-weight:700;text-align:right;">{acc_data['gx']:.2f} °/s</td></tr>
          <tr style="border-top:1px solid #2a2a2a;">
            <td style="color:#aaa;padding:8px 0 4px;">Total Accel |a|</td>
            <td style="color:#ff4444;font-size:15px;font-weight:900;text-align:right;padding:8px 0 4px;">{total_acc:.2f} m/s²</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
      <tr><td style="background:#0d1a0d;border:1px solid #1a4a1a;border-radius:10px;padding:18px 20px;">
        <p style="margin:0 0 14px;color:#4caf50;font-size:10px;letter-spacing:2px;text-transform:uppercase;">📍 Last Known Location</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td style="color:#aaa;font-size:12px;padding:4px 0;width:38%;">City</td>   <td style="color:#fff;font-size:13px;font-weight:700;text-align:right;">{city}</td></tr>
          <tr><td style="color:#aaa;font-size:12px;padding:4px 0;">State</td>  <td style="color:#fff;font-size:13px;font-weight:700;text-align:right;">{state}</td></tr>
          <tr><td style="color:#aaa;font-size:12px;padding:4px 0;">Country</td><td style="color:#fff;font-size:13px;font-weight:700;text-align:right;">{country}</td></tr>
        </table>
        <div style="border-top:1px solid #1a4a1a;margin:0 0 12px;"></div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr><td style="color:#777;font-size:11px;padding:3px 0;">Latitude</td> <td style="color:#aaa;font-size:11px;font-weight:700;text-align:right;">{lat:.6f}°</td></tr>
          <tr><td style="color:#777;font-size:11px;padding:3px 0;">Longitude</td><td style="color:#aaa;font-size:11px;font-weight:700;text-align:right;">{lon:.6f}°</td></tr>
        </table>
        <div style="text-align:center;">
          <a href="{maps_url}" style="display:inline-block;background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:11px 30px;border-radius:99px;letter-spacing:1px;">
            📌 &nbsp;Open in Google Maps
          </a>
        </div>
      </td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #222;margin:0 0 20px;"/>
    <p style="margin:0;color:#555;font-size:12px;text-align:center;line-height:1.9;">
      This alert was auto-generated by the <strong style="color:#888;">TRINETRI Crash Detection System</strong>.<br/>
      If the rider is safe, no further action is needed.<br/>
      If unreachable — <strong style="color:#ff4444;">please contact emergency services immediately.</strong>
    </p>

  </td></tr>

  <tr><td style="padding:16px;text-align:center;">
    <p style="margin:0;color:#333;font-size:10px;letter-spacing:1px;">AUTO-ALERT · CRASH DETECTION SYSTEM · {date_str.upper()}</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""
    return html_str, graph_png

def send_sos(conf, impact_speed=0, acc_data=None, crash_time=None, timeline=None):
    loc = get_location()
    if acc_data   is None: acc_data   = {"ax": 0, "ay": 0, "az": 0, "gx": 0}
    if crash_time is None: crash_time = datetime.datetime.now()

    print("\n🚨 SENDING SOS...")
    html_body, graph_png = build_html_email(conf, loc, impact_speed, acc_data, crash_time, timeline)

    msg = MIMEMultipart("related")
    msg["Subject"] = f"🚨 SOS ALERT — Crash Detected ({int(conf*100)}% confidence)"
    msg["From"]    = EMAIL_SENDER
    msg["To"]      = EMAIL_RECEIVER
    msg_alternative = MIMEMultipart("alternative")
    city, state, country = get_address(loc["lat"], loc["lon"])
    plain = (
        f"SOS ALERT - CRASH DETECTED\n\n"
        f"Time         : {crash_time.strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"Confidence   : {int(conf*100)}%\n"
        f"Impact Speed : {impact_speed:.1f} km/h\n"
        f"City         : {city}\n"
        f"State        : {state}\n"
        f"Country      : {country}\n"
        f"Latitude     : {loc['lat']}\n"
        f"Longitude    : {loc['lon']}\n"
        f"Map          : https://www.google.com/maps?q={loc['lat']},{loc['lon']}\n"
    )
    msg_alternative.attach(MIMEText(plain, "plain"))
    msg_alternative.attach(MIMEText(html_body, "html"))
    msg.attach(msg_alternative)

    if graph_png:
        img = MIMEImage(graph_png, _subtype="png")
        img.add_header('Content-ID', '<crash_graph>')
        img.add_header('Content-Disposition', 'inline', filename='graph.png')
        msg.attach(img)

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, msg.as_string())
        server.quit()
        print("📧 SOS SENT SUCCESSFULLY!")
    except Exception as e:
        print(f"❌ Email error: {e}")

def handle_alert(conf, impact_speed=0, acc_data=None, timeline=None):
    crash_time = datetime.datetime.now()
    print("\n\n🚨 CRASH DETECTED !!!")
    print("🔔 Playing alert sound...\n")
    beep()
    print("⚠️  Are you safe?")
    print("👉  Press ENTER within 10 seconds to cancel SOS\n")

    def clean_dashboard_sos():
        try:
            requests.post("http://127.0.0.1:9000/reset_sos", timeout=0.5)
        except:
            pass

    start = time.time()

    while time.time() - start < 10:
        if os.name == "nt":
            import msvcrt
            if msvcrt.kbhit():
                msvcrt.getch()
                print("\n✅ User responded. SOS cancelled.")
                clean_dashboard_sos()
                return
        else:
            import select, sys
            ready, _, _ = select.select([sys.stdin], [], [], 0.1)
            if ready:
                sys.stdin.readline()
                print("\n✅ User responded. SOS cancelled.")
                clean_dashboard_sos()
                return
                
        try:
            res = requests.get("http://127.0.0.1:9000/sos_status", timeout=0.2).json()
            if res.get("cancelled"):
                print("\n✅ User responded via Dashboard. SOS cancelled.")
                clean_dashboard_sos()
                return
        except:
            pass

        time.sleep(0.1)

    print("\n❌ No response! Sending SOS...")
    clean_dashboard_sos()
    send_sos(conf, impact_speed=impact_speed, acc_data=acc_data,
             crash_time=crash_time, timeline=timeline)

def send_data(ax, ay, az, gx, gy, gz, speed, phase="Normal"):
    data = {
        "ax": float(ax), "ay": float(ay), "az": float(az),
        "gx": float(gx), "gy": float(gy), "gz": float(gz),
        "speed": float(speed), "timestamp": time.time(),
    }
    res_json = None
    try:
        res = session.post(CRASH_SERVER_URL, json=data, timeout=1)
        res_json = res.json()
    except Exception:
        pass
        
    try:
        acc = (ax**2 + ay**2 + az**2)**0.5
        gyro = (gx**2 + gy**2 + gz**2)**0.5
        conf = res_json.get("confidence", 0) if res_json else 0
        status = res_json.get("event", res_json.get("status", "Normal")) if res_json else "Normal"
        session.post("http://127.0.0.1:9000/telemetry", json={
            "speed": float(speed),
            "acc": float(acc),
            "gyro": float(gyro),
            "confidence": float(conf),
            "status": status,
            "phase": phase
        }, timeout=0.5)
    except Exception:
        pass
        
    return res_json, data


def simulate():
    speed        = np.random.uniform(30, 70)
    alert_active = False

    while True:

        print(f"\n🏍️  Normal riding phase... (starting at {speed:.1f} km/h)")
        alert_active = False

        for _ in range(200):
            speed += np.random.uniform(-2, 2)
            speed  = float(np.clip(speed, 10, 100))

            res, data = send_data(
                ax=np.random.normal(9.8, 1.5), ay=np.random.normal(0, 1.2),
                az=np.random.normal(0, 1.2),   gx=np.random.normal(0, 0.8),
                gy=np.random.normal(0, 0.8),   gz=np.random.normal(0, 0.8),
                speed=speed,
            )
            acc    = np.sqrt(data["ax"]**2 + data["ay"]**2 + data["az"]**2)
            conf   = res.get("confidence", 0) if res else 0
            status = res.get("event", res.get("status", "")) if res else "no response"
            loc    = get_location()
            print(f"\rSpeed:{speed:.1f} | Acc:{acc:.1f} | Conf:{conf:.2f} | {status} | GPS:{loc}   ",
                  end="", flush=True)

            if res and res.get("event") == "CRASH_DETECTED" and not alert_active:
                alert_active = True
                handle_alert(res["confidence"], impact_speed=speed, acc_data=data, timeline=[])
                alert_active = False
            time.sleep(0.05)

        crash_speed     = float(np.clip(speed, 20, 100))
        impact_speed    = crash_speed
        impact_ax       = float(np.random.uniform(35, 80))
        impact_gx       = float(np.random.uniform(15, 45))
        impact_acc_data = None
        alert_active    = False
        alert_conf      = 0.0
        crash_start_time = time.time()
        timeline = []

        def record(phase, spd, d):
            acc = np.sqrt(d["ax"]**2 + d["ay"]**2 + d["az"]**2)
            timeline.append({
                "t"    : time.time() - crash_start_time,
                "speed": spd,
                "acc"  : acc,
                "gx"   : abs(d["gx"]),
                "phase": phase,
            })

        print(f"\n\n💥 CRASH SIMULATION! (speed={crash_speed:.1f} km/h, peak_ax={impact_ax:.1f})")
        print("\n  Phase 1: Pre-impact swerve...")
        for _ in range(10):
            crash_speed = max(crash_speed - np.random.uniform(2, 5), 5)
            res, data = send_data(
                ax=np.random.normal(18, 4), ay=np.random.normal(8, 3),
                az=np.random.normal(5, 2),  gx=np.random.normal(5, 2),
                gy=np.random.normal(3, 1),  gz=np.random.normal(3, 1),
                speed=crash_speed,
                phase="Pre-Impact"
            )
            record("Pre-Impact", crash_speed, data)
            conf = res.get("confidence", 0) if res else 0
            print(f"\r  Conf:{conf:.2f} | Speed:{crash_speed:.1f}   ", end="", flush=True)
            if res and res.get("event") == "CRASH_DETECTED" and not alert_active:
                alert_active    = True
                impact_acc_data = data
                alert_conf      = res.get("confidence", 0)
            time.sleep(0.05)

        print("\n  Phase 2: Impact burst...")
        for i in range(20):
            taper       = np.sin(np.pi * i / 19)
            cur_ax      = impact_ax * taper + np.random.normal(0, 5)
            cur_gx      = impact_gx * taper + np.random.normal(0, 3)
            crash_speed = max(crash_speed - np.random.uniform(1, 3), 0)
            res, data = send_data(
                ax=cur_ax,
                ay=np.random.normal(0, 6) * taper,
                az=np.random.normal(0, 6) * taper,
                gx=cur_gx,
                gy=np.random.normal(0, 4) * taper,
                gz=np.random.normal(0, 4) * taper,
                speed=crash_speed,
                phase="Impact"
            )
            record("Impact", crash_speed, data)
            conf = res.get("confidence", 0) if res else 0
            print(f"\r  Conf:{conf:.2f} | ax:{cur_ax:.1f} | Speed:{crash_speed:.1f}   ",
                  end="", flush=True)
            if res and res.get("event") == "CRASH_DETECTED" and not alert_active:
                alert_active    = True
                impact_acc_data = data
                alert_conf      = res.get("confidence", 0)
            time.sleep(0.05)

        print("\n  Phase 3: Post-impact slide...")
        slide_speed = crash_speed
        for _ in range(100):
            slide_speed = max(slide_speed - np.random.uniform(0, 0.8), 0)
            res, data = send_data(
                ax=np.random.normal(0, 3),   ay=np.random.normal(0, 3),
                az=np.random.normal(9.8, 2), gx=np.random.normal(0, 2),
                gy=np.random.normal(0, 2),   gz=np.random.normal(0, 2),
                speed=slide_speed,
                phase="Sliding"
            )
            record("Sliding", slide_speed, data)
            conf = res.get("confidence", 0) if res else 0
            print(f"\r  Conf:{conf:.2f} | Speed:{slide_speed:.1f} (sliding)   ",
                  end="", flush=True)
            if res and res.get("event") == "CRASH_DETECTED" and not alert_active:
                alert_active    = True
                impact_acc_data = data
                alert_conf      = res.get("confidence", 0)
            time.sleep(0.05)

        if alert_active:
            handle_alert(alert_conf, impact_speed=impact_speed,
                         acc_data=impact_acc_data, timeline=timeline)

        print("\n🛑 Stationary phase...")
        for _ in range(200):
            send_data(
                ax=np.random.normal(0, 0.3),   ay=np.random.normal(0, 0.3),
                az=np.random.normal(9.8, 0.3), gx=np.random.normal(0, 0.1),
                gy=np.random.normal(0, 0.1),   gz=np.random.normal(0, 0.1),
                speed=0,
                phase="Stationary"
            )
            time.sleep(0.05)

        speed = np.random.uniform(30, 70)

if __name__ == "__main__":
    simulate()