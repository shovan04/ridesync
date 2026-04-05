package com.example.crashdetection

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.*
import android.view.WindowManager
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.example.crashdetection.databinding.ActivityMainBinding
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.Properties
import java.util.concurrent.TimeUnit
import javax.mail.Authenticator
import javax.mail.Message
import javax.mail.PasswordAuthentication
import javax.mail.Session
import javax.mail.Transport
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeMessage
import kotlin.math.sqrt

// ════════════════════════════════════════════════════════════════════════════
// ⚠️  EDIT THESE BEFORE BUILDING
// ════════════════════════════════════════════════════════════════════════════
private const val SERVER_URL        = "http://13.60.48.119:7860/sensor"
private const val EMAIL_SENDER      = "sayantanpatraodob@gmail.com"
private const val EMAIL_PASSWORD    = "oocwrjnxhmpxbody"
private const val EMAIL_RECEIVER    = "somhritastudy@gmail.com"
private const val SOS_COUNTDOWN     = 10          // seconds
private const val CRASH_COOLDOWN_MS = 15000L      // 15s cooldown between crash alerts
// ════════════════════════════════════════════════════════════════════════════

class MainActivity : AppCompatActivity(), SensorEventListener, LocationListener {

    // ── view binding ─────────────────────────────────────────────────────────
    private lateinit var binding: ActivityMainBinding

    // ── sensors ───────────────────────────────────────────────────────────────
    private lateinit var sensorManager: SensorManager
    private var accelSensor: Sensor? = null
    private var gyroSensor:  Sensor? = null

    // ── location ──────────────────────────────────────────────────────────────
    private lateinit var locationManager: LocationManager
    private var currentLat   = 0.0
    private var currentLon   = 0.0
    private var currentSpeed = 0.0f

    // ── sensor values — @Volatile so network thread always reads latest ───────
    @Volatile private var ax = 0f
    @Volatile private var ay = 0f
    @Volatile private var az = 0f
    @Volatile private var gx = 0f
    @Volatile private var gy = 0f
    @Volatile private var gz = 0f

    // ── last sent snapshot — skip sending if nothing changed ──────────────────
    private var lastSentAx = Float.MAX_VALUE
    private var lastSentAy = Float.MAX_VALUE
    private var lastSentAz = Float.MAX_VALUE

    // ── state ─────────────────────────────────────────────────────────────────
    private var isStreaming       = false
    private var alertShowing      = false
    private var isRequestInFlight = false
    private var lastCrashTime     = 0L       // timestamp of last crash alert
    private var impactData        = JSONObject()
    private var impactSpeed       = 0.0f

    // ── HTTP ──────────────────────────────────────────────────────────────────
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .writeTimeout(5, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json; charset=utf-8".toMediaType()

    // ── handler for 30ms loop ─────────────────────────────────────────────────
    private val handler      = Handler(Looper.getMainLooper())
    private val sendRunnable = object : Runnable {
        override fun run() {
            if (isStreaming) {
                postSensorData()
                handler.postDelayed(this, 30L)
            }
        }
    }

    // ── SOS countdown ─────────────────────────────────────────────────────────
    private var countdownTimer: CountDownTimer? = null

    // ─────────────────────────────────────────────────────────────────────────
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setupSensors()
        setupButtons()
        requestPermissions()
    }

    // ── SETUP ─────────────────────────────────────────────────────────────────
    private fun setupSensors() {
        sensorManager   = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        accelSensor     = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroSensor      = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
    }

    private fun setupButtons() {
        binding.btnToggle.setOnClickListener {
            if (isStreaming) stopMonitoring() else startMonitoring()
        }
    }

    private fun requestPermissions() {
        val perms = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        val missing = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 1001)
        }
    }

    // ── START / STOP ──────────────────────────────────────────────────────────
    private fun startMonitoring() {
        isStreaming = true

        accelSensor?.let { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST) }
        gyroSensor?.let  { sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST) }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED) {
            
            // Try to get last known location immediately
            val lastGps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val lastNet = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            val best = lastGps ?: lastNet
            best?.let {
                currentLat = it.latitude
                currentLon = it.longitude
            }

            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER,     1000L, 0f, this)
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 1000L, 0f, this)
        }

        handler.post(sendRunnable)

        binding.btnToggle.text = "⏹  STOP MONITORING"
        binding.btnToggle.setBackgroundColor(0xFF3A1A1A.toInt())
        binding.tvStatus.text  = "● Streaming to server..."
        binding.tvStatus.setTextColor(0xFF44FF44.toInt())
    }

    private fun stopMonitoring() {
        isStreaming = false
        sensorManager.unregisterListener(this)
        locationManager.removeUpdates(this)
        handler.removeCallbacks(sendRunnable)

        binding.btnToggle.text = "▶  START MONITORING"
        binding.btnToggle.setBackgroundColor(0xFF1A3A1A.toInt())
        binding.tvStatus.text  = "● Idle — press START"
        binding.tvStatus.setTextColor(0xFF555555.toInt())
    }

    // ── SENSOR CALLBACKS ──────────────────────────────────────────────────────
    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                ax = event.values[0]
                ay = event.values[1]
                az = event.values[2]
            }
            Sensor.TYPE_GYROSCOPE -> {
                gx = event.values[0]
                gy = event.values[1]
                gz = event.values[2]
            }
        }
        updateSensorUI()
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}

    // ── GPS CALLBACKS ─────────────────────────────────────────────────────────
    override fun onLocationChanged(location: Location) {
        currentLat = location.latitude
        currentLon = location.longitude
        if (location.hasSpeed()) {
            currentSpeed = location.speed * 3.6f
        }
        binding.tvSpeed.text = "GPS Speed: ${"%.1f".format(currentSpeed)} km/h"
    }

    // ── POST SENSOR DATA TO SERVER ────────────────────────────────────────────
    private fun postSensorData() {
        if (isRequestInFlight) return

        val snapAx    = ax
        val snapAy    = ay
        val snapAz    = az
        val snapGx    = gx
        val snapGy    = gy
        val snapGz    = gz
        val snapSpeed = currentSpeed

        if (snapAx == lastSentAx && snapAy == lastSentAy && snapAz == lastSentAz) return

        lastSentAx = snapAx
        lastSentAy = snapAy
        lastSentAz = snapAz

        isRequestInFlight = true

        val total = sqrt(snapAx * snapAx + snapAy * snapAy + snapAz * snapAz)

        val data = JSONObject().apply {
            put("ax",        snapAx.toDouble())
            put("ay",        snapAy.toDouble())
            put("az",        snapAz.toDouble())
            put("gx",        snapGx.toDouble())
            put("gy",        snapGy.toDouble())
            put("gz",        snapGz.toDouble())
            put("speed",     snapSpeed.toDouble())
            put("timestamp", System.currentTimeMillis() / 1000.0)
        }

        val body = data.toString().toRequestBody(JSON)
        val req  = Request.Builder().url(SERVER_URL).post(body).build()

        client.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                isRequestInFlight = false
                runOnUiThread {
                    binding.tvStatus.text = "⚠ Connection error"
                    binding.tvStatus.setTextColor(0xFFFF8C00.toInt())
                }
            }

            override fun onResponse(call: Call, response: Response) {
                isRequestInFlight = false
                val bodyStr = response.body?.string() ?: return
                try {
                    val json = JSONObject(bodyStr)
                    val conf = json.optDouble("confidence", 0.0)

                    runOnUiThread {
                        updateConfidenceUI(conf)
                        binding.tvStatus.text = "● Streaming... |a|: ${"%.1f".format(total)}"
                        binding.tvStatus.setTextColor(0xFF44FF44.toInt())
                    }

                    val now           = System.currentTimeMillis()
                    val isCrash       = json.optString("event") == "CRASH_DETECTED"
                    val cooldownDone  = (now - lastCrashTime) > CRASH_COOLDOWN_MS

                    if (isCrash && !alertShowing && cooldownDone) {
                        lastCrashTime = now
                        impactData    = data
                        impactSpeed   = snapSpeed
                        runOnUiThread { showSOSDialog(conf) }
                    }

                } catch (_: Exception) {}
            }
        })
    }

    // ── UI UPDATES ────────────────────────────────────────────────────────────
    private fun updateSensorUI() {
        val total = sqrt(ax * ax + ay * ay + az * az)
        val color = if (total > 30f) 0xFFFF4444.toInt() else 0xFFFFFFFF.toInt()

        runOnUiThread {
            binding.tvAx.text    = "ax: ${"%.2f".format(ax)} m/s²"
            binding.tvAy.text    = "ay: ${"%.2f".format(ay)} m/s²"
            binding.tvAz.text    = "az: ${"%.2f".format(az)} m/s²"
            binding.tvGx.text    = "gx: ${"%.2f".format(gx)} °/s"
            binding.tvTotal.text = "|a|: ${"%.2f".format(total)} m/s²"
            binding.tvTotal.setTextColor(color)
        }
    }

    private fun updateConfidenceUI(conf: Double) {
        val pct   = (conf * 100).toInt()
        val color = when {
            pct > 70 -> 0xFFFF2D2D.toInt()
            pct > 40 -> 0xFFFF8C00.toInt()
            else     -> 0xFF44FF44.toInt()
        }
        binding.tvConfidence.text     = "$pct%"
        binding.tvConfidence.setTextColor(color)
        binding.progressConf.progress = pct
    }

    // ── SOS DIALOG ────────────────────────────────────────────────────────────
    private fun showSOSDialog(conf: Double) {
        if (alertShowing) return
        alertShowing = true

        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(
                longArrayOf(0, 400, 200, 400, 200, 400), -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(longArrayOf(0, 400, 200, 400, 200, 400), -1)
        }

        val dialogView  = layoutInflater.inflate(R.layout.dialog_sos, null)
        val tvTimer     = dialogView.findViewById<android.widget.TextView>(R.id.tvTimer)
        val progressBar = dialogView.findViewById<android.widget.ProgressBar>(R.id.progressSos)
        val btnCancel   = dialogView.findViewById<android.widget.Button>(R.id.btnCancelSOS)
        progressBar.max = SOS_COUNTDOWN

        val dialog = AlertDialog.Builder(this, R.style.SOSDialog)
            .setView(dialogView)
            .setCancelable(false)
            .create()

        btnCancel.setOnClickListener {
            countdownTimer?.cancel()
            dialog.dismiss()
            alertShowing = false
            binding.tvStatus.text = "✅ SOS cancelled — rider OK"
            binding.tvStatus.setTextColor(0xFF44FF44.toInt())
        }

        dialog.show()

        countdownTimer = object : CountDownTimer(
            (SOS_COUNTDOWN * 1000).toLong(), 1000L
        ) {
            override fun onTick(ms: Long) {
                val s = (ms / 1000).toInt() + 1
                tvTimer.text         = "Sending SOS in ${s}s"
                progressBar.progress = s
            }
            override fun onFinish() {
                dialog.dismiss()
                alertShowing = false
                fireSOS(conf)
            }
        }.start()
    }

    // ── FIRE SOS ──────────────────────────────────────────────────────────────
    private fun fireSOS(conf: Double) {
        binding.tvStatus.text = "🚨 Sending SOS email..."
        binding.tvStatus.setTextColor(0xFFFF4444.toInt())

        lifecycleScope.launch(Dispatchers.IO) {
            sendSOSEmail(conf)
            withContext(Dispatchers.Main) {
                binding.tvStatus.text = "📧 SOS sent!"
            }
        }
    }

    // ── SOS EMAIL ─────────────────────────────────────────────────────────────
    private fun sendSOSEmail(conf: Double) {
        // Use the most up-to-date coordinates
        val lat = currentLat
        val lon = currentLon
        val mapsUrl = "https://www.google.com/maps?q=$lat,$lon"
        
        val now     = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        val timeStr = now.substringAfter(" ")
        val dateStr = now.substringBefore(" ")

        val confPct   = (conf * 100).toInt()
        val confColor = when {
            confPct > 70 -> "#ff2d2d"
            confPct > 40 -> "#ff8c00"
            else         -> "#4caf50"
        }
        val totalAcc = sqrt(
            impactData.optDouble("ax") * impactData.optDouble("ax") +
                    impactData.optDouble("ay") * impactData.optDouble("ay") +
                    impactData.optDouble("az") * impactData.optDouble("az")
        )

        // Try to reverse geocode the location
        var city = "Unknown"; var state = "Unknown"; var country = "Unknown"
        try {
            val geocoder = Geocoder(this, java.util.Locale.getDefault())
            val addresses = geocoder.getFromLocation(lat, lon, 1)
            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                city = addr.locality ?: addr.subAdminArea ?: "Unknown"
                state = addr.adminArea ?: "Unknown"
                country = addr.countryName ?: "Unknown"
            }
        } catch (e: Exception) { e.printStackTrace() }

        val html = """
<!DOCTYPE html>
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
        <p style="margin:0;color:#fff;font-size:24px;font-weight:700;">$timeStr</p>
        <p style="margin:2px 0 0;color:#aaa;font-size:13px;">$dateStr</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td width="48%" style="background:#1a1a1a;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
          <p style="margin:0 0 6px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Crash Confidence</p>
          <p style="margin:0;font-size:42px;font-weight:900;color:$confColor;">$confPct%</p>
          <div style="margin:10px auto 0;width:80%;background:#2a2a2a;border-radius:99px;height:6px;">
            <div style="width:$confPct%;background:$confColor;height:6px;border-radius:99px;"></div>
          </div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#1a1a1a;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
          <p style="margin:0 0 6px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Speed at Impact</p>
          <p style="margin:0;font-size:42px;font-weight:900;color:#ff8c00;">${"%.1f".format(impactSpeed)}</p>
          <p style="margin:4px 0 0;color:#777;font-size:13px;">km/h</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr><td style="background:#1a1a1a;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 12px;color:#777;font-size:10px;letter-spacing:2px;text-transform:uppercase;">📡 Sensor Data at Peak Impact</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr><td style="color:#aaa;padding:5px 0;">Accel X (ax)</td><td style="color:#fff;font-weight:700;text-align:right;">${"%.2f".format(impactData.optDouble("ax"))} m/s²</td></tr>
          <tr><td style="color:#aaa;padding:5px 0;">Accel Y (ay)</td><td style="color:#fff;font-weight:700;text-align:right;">${"%.2f".format(impactData.optDouble("ay"))} m/s²</td></tr>
          <tr><td style="color:#aaa;padding:5px 0;">Accel Z (az)</td><td style="color:#fff;font-weight:700;text-align:right;">${"%.2f".format(impactData.optDouble("az"))} m/s²</td></tr>
          <tr><td style="color:#aaa;padding:5px 0;">Gyro X (gx)</td><td style="color:#fff;font-weight:700;text-align:right;">${"%.2f".format(impactData.optDouble("gx"))} °/s</td></tr>
          <tr style="border-top:1px solid #2a2a2a;">
            <td style="color:#aaa;padding:8px 0 4px;">Total Accel |a|</td>
            <td style="color:#ff4444;font-size:15px;font-weight:900;text-align:right;padding:8px 0 4px;">${"%.2f".format(totalAcc)} m/s²</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
      <tr><td style="background:#0d1a0d;border:1px solid #1a4a1a;border-radius:10px;padding:18px 20px;">
        <p style="margin:0 0 14px;color:#4caf50;font-size:10px;letter-spacing:2px;text-transform:uppercase;">📍 Last Known Location</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td style="color:#aaa;font-size:12px;padding:4px 0;width:38%;">City</td>   <td style="color:#fff;font-size:13px;font-weight:700;text-align:right;">$city</td></tr>
          <tr><td style="color:#aaa;font-size:12px;padding:4px 0;">State</td>  <td style="color:#fff;font-size:13px;font-weight:700;text-align:right;">$state</td></tr>
          <tr><td style="color:#aaa;font-size:12px;padding:4px 0;">Country</td><td style="color:#fff;font-size:13px;font-weight:700;text-align:right;">$country</td></tr>
        </table>
        <div style="border-top:1px solid #1a4a1a;margin:0 0 12px;"></div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr><td style="color:#777;font-size:11px;padding:3px 0;">Latitude</td> <td style="color:#aaa;font-size:11px;font-weight:700;text-align:right;">${"%.6f".format(lat)}°</td></tr>
          <tr><td style="color:#777;font-size:11px;padding:3px 0;">Longitude</td><td style="color:#aaa;font-size:11px;font-weight:700;text-align:right;">${"%.6f".format(lon)}°</td></tr>
        </table>
        <div style="text-align:center;">
          <a href="$mapsUrl" style="display:inline-block;background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:11px 30px;border-radius:99px;letter-spacing:1px;">
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
    <p style="margin:0;color:#333;font-size:10px;letter-spacing:1px;">AUTO-ALERT · CRASH DETECTION SYSTEM · ${dateStr.uppercase()}</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
        """.trimIndent()

        val props = Properties().apply {
            put("mail.smtp.auth", "true")
            put("mail.smtp.starttls.enable", "true")
            put("mail.smtp.host", "smtp.gmail.com")
            put("mail.smtp.port", "587")
        }

        val session = Session.getInstance(props, object : Authenticator() {
            override fun getPasswordAuthentication() = PasswordAuthentication(EMAIL_SENDER, EMAIL_PASSWORD)
        })

        try {
            val message = MimeMessage(session).apply {
                setFrom(InternetAddress(EMAIL_SENDER))
                setRecipients(Message.RecipientType.TO, InternetAddress.parse(EMAIL_RECEIVER))
                subject = "🚨 CRASH SOS ALERT: Rider May Need Help!"
                setContent(html, "text/html; charset=utf-8")
            }
            Transport.send(message)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
