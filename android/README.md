# FitTrack Android Companion App 📱

A native Android companion application built with **Kotlin** and **Jetpack Compose (Material3)** designed to provide continuous, all-day background step tracking for the **FitTrack** platform using **Google Health Connect** and device hardware sensors (`Sensor.TYPE_STEP_COUNTER`).

---

## 🏗️ Architecture Overview

Standard web browsers running on Android (such as Chrome or Firefox) cannot access hardware pedometer sensors or Google Health Connect in the background due to Android operating system sandboxing and battery optimization policies.

This native companion app bridges that gap:

```
┌────────────────────────────────────────────────────────┐
│               Android Operating System                 │
├───────────────────────────┬────────────────────────────┤
│   Google Health Connect   │  Hardware Pedometer Sensor │
│  (Samsung Health, Google  │  (Sensor.TYPE_STEP_COUNTER)│
│    Fit, Pixel, Garmin)    │                            │
└─────────────┬─────────────┴──────────────┬─────────────┘
              │ AggregateRequest           │ Midnight Baseline
              ▼ (Deduplication)            ▼ Tracking
┌────────────────────────────────────────────────────────┐
│             FitTrack Android Companion App             │
│   • HealthConnectManager                               │
│   • StepSensorManager                                  │
│   • Jetpack Compose UI (Progress Ring & Sync Status)   │
│   • AndroidX WorkManager (Periodic Background Sync)    │
│   • JavascriptInterface Bridge (WebView Companion)     │
└──────────────┬───────────────────────────┬─────────────┘
               │ Background HTTP Sync      │ window.FitTrackAndroidBridge
               ▼ (OkHttp / JSON)           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│   FitTrack Cloud API      │ │    FitTrack Web PWA      │
│   (/api/sync Endpoint)    │ │   (React / IndexedDB)    │
└──────────────┬────────────┘ └──────────────────────────┘
               │ Polling / Manual Refresh
               ▼
┌───────────────────────────┐
│ FitTrack Web Application  │
│ (Vercel / Mobile Browser) │
└───────────────────────────┘
```

### Key Technical Characteristics:
1. **Health Connect Aggregation**: Queries `AggregateRequest(setOf(StepsRecord.COUNT_TOTAL))` over local day boundaries (`00:00:00` to now). Health Connect automatically resolves overlapping time intervals to prevent double-counting when steps are logged by both a smartwatch and phone pedometer.
2. **Hardware Step Counter Fallback**: If Health Connect is unavailable or uninstalled on older devices, `StepSensorManager` listens to `Sensor.TYPE_STEP_COUNTER`, recording cumulative boot steps against a midnight baseline in encrypted SharedPreferences.
3. **Resilient Background Sync with WorkManager**: `StepSyncWorker` runs periodically (`PeriodicWorkRequestBuilder`) with battery-conscious constraints (`NetworkType.CONNECTED`) and exponential backoff retry.
4. **Offline Resilience**: Step counts are cached locally on the device; synchronization retries automatically once an internet connection is re-established.
5. **Zero Data Fabrication**: Transparent state reporting. If permissions are missing or hardware sensors are absent, the app communicates exact states rather than fabricating synthetic steps.

---

## 📋 Prerequisites & Requirements

- **Android Studio**: Hedgehog (2023.1.1) or newer recommended.
- **Java Development Kit**: JDK 17+.
- **Android SDK**:
  - Target SDK: **34** (Android 14)
  - Minimum SDK: **26** (Android 8.0 Oreo)
  - Compile SDK: **34**
- **Hardware Requirement**:
  - A physical Android device with Google Play Services and Health Connect installed.
  - *Note on Emulators*: Android emulators lack hardware pedometer steps by default. To test Health Connect on emulators, install the **Health Connect Toolbox** from Google Play to inject mock aggregated records.

---

## 🔐 Required Permissions

The app declares and manages the following permissions in `AndroidManifest.xml` and Compose runtime:

| Permission | Purpose |
|---|---|
| `android.permission.ACTIVITY_RECOGNITION` | Allows access to the physical device step counter sensor (`TYPE_STEP_COUNTER`). |
| `android.permission.BODY_SENSORS` | For physiological sensor compatibility across OEM vendors. |
| `android.permission.INTERNET` | Securely transmits step counts to the FitTrack `/api/sync` endpoint. |
| `android.permission.ACCESS_NETWORK_STATE` | WorkManager network constraint validation before triggering sync tasks. |
| `android.permission.health.READ_STEPS` | Grants read access to aggregated step records in Google Health Connect. |
| `android.permission.health.READ_DISTANCE` | Reads aggregated distance data from Health Connect. |
| `android.permission.health.READ_TOTAL_CALORIES_BURNED` | Reads energy expenditure records from Health Connect. |

---

## 🚀 Setup & Build Instructions

### 1. Open the Project in Android Studio
1. Launch Android Studio.
2. Select **Open** and browse to the `android/` directory inside this repository:
   ```
   c:\Users\<user>\Desktop\fit track\android
   ```
3. Allow Gradle to sync dependencies (`Jetpack Compose BOM 2024.02.00`, `androidx.health.connect:connect-client:1.1.0-alpha11`, `androidx.work:work-runtime-ktx:2.9.0`, `com.squareup.okhttp3:okhttp:4.12.0`).

### 2. Configure Sync Settings
In the companion app's UI (or in `android/app/src/main/java/com/fittrack/companion/MainActivity.kt`):
- **Server URL**:
  - For local development: `http://10.0.2.2:3000/api/sync` (Android Emulator to local host) or your local Wi-Fi IP (e.g., `http://192.168.1.100:3000/api/sync`).
  - For production: Your deployed Vercel domain: `https://your-fittrack-app.vercel.app/api/sync`.
- **Pairing Token**:
  - Found in your FitTrack Web Dashboard under **Activity > Android Tracking Hub** or **Profile > Android Companion**.
  - Default development token: `FT-7492A1`.

### 3. Build & Run
- Connect your physical Android phone via USB with **USB Debugging** enabled in Developer Options.
- In Android Studio, select your device in the toolbar device dropdown.
- Click **Run 'app'** (`Shift + F10`) or run from terminal:
  ```bash
  # Linux/macOS
  ./gradlew installDebug

  # Windows PowerShell
  .\gradlew.bat installDebug
  ```

---

## 🧪 Testing & Verification Guide

### 1. Health Connect Permission Prompt
1. Launch the app on your phone.
2. Tap **Request Permissions**.
3. When redirected to the Google Health Connect system dialog, grant permission to read **Steps**, **Distance**, and **Calories**.
4. Return to FitTrack Companion. The status card will update to **Health Connect Active** with a live step count.

### 2. Triggering Background WorkManager via ADB
To test periodic background sync without waiting 15–30 minutes for Android OS scheduling:

```bash
# Force immediate execution of WorkManager sync job:
adb shell cmd jobscheduler run -f com.fittrack.companion 1
```

Check the logcat stream for synchronization confirmations:
```bash
adb logcat -s FitTrackStepSync:D FitTrackSensor:D FitTrackHC:D
```

### 3. Verifying Synchronization in FitTrack Web
1. Open the FitTrack web application on your phone or desktop.
2. Navigate to **Activity > Android Tracking Hub**.
3. Tap **Fetch Remote Steps**.
4. The dashboard will immediately show your aggregated steps tagged with the **Health Connect** or **Step Sensor** badge and update your daily progress ring.

---

## 📦 Directory Structure

```
android/
├── app/
│   ├── build.gradle.kts          # Dependencies & SDK versions (Min 26, Target 34)
│   ├── proguard-rules.pro        # R8 / ProGuard obfuscation rules
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml   # Permissions, Health Connect queries & rationale
│           ├── java/com/fittrack/companion/
│           │   ├── FitTrackApp.kt                # Application class & WorkManager scheduler
│           │   ├── MainActivity.kt               # Jetpack Compose UI & permission orchestration
│           │   ├── PermissionsRationaleActivity.kt # Health Connect explanation screen
│           │   ├── bridge/
│           │   │   └── FitTrackAndroidBridge.kt  # JavascriptInterface for hybrid WebView
│           │   ├── healthconnect/
│           │   │   └── HealthConnectManager.kt   # Health Connect aggregation client
│           │   ├── model/
│           │   │   └── SyncModels.kt             # Data transfer objects for /api/sync
│           │   ├── sensor/
│           │   │   └── StepSensorManager.kt      # Hardware TYPE_STEP_COUNTER listener
│           │   ├── sync/
│           │   │   ├── FitTrackSyncService.kt    # OkHttp JSON HTTP client
│           │   │   └── StepSyncWorker.kt         # WorkManager background sync task
│           │   └── ui/
│           │       ├── components/               # Progress rings & status cards
│           │       └── theme/                    # FitTrack emerald & navy color palette
│           └── res/                              # Icons, colors, strings, themes
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties
├── build.gradle.kts              # Root build configuration
├── gradle.properties             # JVM args and AndroidX flags
└── settings.gradle.kts           # Repository definitions & app module
```

---

## 🔒 Security & Privacy Notice

- All step metrics gathered by this companion app are transmitted exclusively to your configured FitTrack server via HTTPS with bearer token validation (`X-Sync-Token`).
- No personal health data is ever transmitted to third-party ad networks or analytics services.
- The companion app respects Android's battery-saving rules and never retains persistent wake locks.
