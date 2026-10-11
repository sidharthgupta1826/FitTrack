# FitTrack — Personal Fitness & Activity Tracker

FitTrack is a modern, responsive fitness tracking web platform and Progressive Web App (PWA) designed primarily for Android smartphone users and runners, joggers, walkers, and everyday fitness enthusiasts. FitTrack is built with a light-mode, deep emerald green design system inspired by the functional clarity of Samsung Health, but featuring 100% original branding, architecture, and code.

---

## 🌟 Key Features

### 1. Dynamic Personalized Dashboard
- **Daily Movement Hub**: Real-time progress towards the daily step goal (default 8,000 steps).
- **Animated Progress Ring**: Visual circular completion indicator with milestones and celebratory particle animations.
- **Key Health Metrics**: Distance walked/run, approximate calories burned (MET calculation), and active movement minutes.
- **Activity Summary**: Distance breakdown across running, jogging, and walking sessions.
- **Weekly Overview Chart**: Interactive bar chart from Monday to Sunday with benchmark goal line and week-over-week comparison percentage.
- **Transparent Demo Mode**: Seeds realistic 14-day sample records on first launch, clearly tagged with a 1-click **Clear Demo Data** action.

### 2. Daily Step Tracking & Date History
- **Historical Calendar & Navigator**: Switch between any date to inspect past activity records or log retroactively.
- **Manual Step Logger**: Quick entry modal with instant distance and calorie preview, presets (`+2,000`, `+5,000`, `+8,000`), and duplicate-entry protection.
- **Activity History Log**: Filterable tabular view showing date, steps, goal progress percentage, distance, calories, and source badge (`manual`, `imported`, `demo`).

### 3. Android Health Connect & Integration Architecture
- **Transparent Android Integration**: Explains clearly to users that standard web browsers cannot continuously read hardware pedometer sensors in the background.
- **Platform Connector**: Sync button with simulated and native bridge detection (`window.FitTrackAndroidBridge`).
- **File Importer**: Supports importing CSV and JSON activity exports from Samsung Health, Google Takeout, and Health Connect.
- **Kotlin Companion Bridge Spec**: Complete architectural blueprint and code snippet for building a native Android wrapper with `androidx.health.connect.client.HealthConnectClient`.

### 4. Running, Jogging & Walking Workout Tracker
- **Dual Tracking Modes**:
  1. **Live GPS Workout Tracker**:
     - Real-time stopwatch timer (MM:SS).
     - Live distance accumulation calculated via the **Haversine formula** from GPS coordinates.
     - Dynamic pace calculation: $\text{Pace} = \frac{\text{Duration (min)}}{\text{Distance (km)}}$.
     - Real-time calorie burn estimator based on MET values.
     - Interactive Leaflet map rendering the live GPS polyline route.
     - Graceful geolocation permission handling (prompt, granted, denied, fallback).
  2. **Manual Workout Logger**:
     - Fast entry form with validation.
     - Auto-calculates pace and estimated calories as you type.
     - Optional workout notes and conditions.
- **Workout History**: Filterable by activity type with summary dialog and saved GPS route maps.

### 5. Insights & Analytics (Weekly & Monthly)
- Strict **Monday-to-Sunday** weekly calculations with previous/next week navigation.
- **Daily Steps Distribution**: Interactive Recharts bar chart with goal reference lines.
- **Distance & Calorie Trends**: Area gradient chart tracking performance over time.
- **Activity Share**: Donut chart visualizing running vs. jogging vs. walking ratios.
- **Week-over-Week Metrics**: Automatic comparison with previous week's performance.

### 6. Personal Goals & Dynamic Achievements
- **Customizable Targets**:
  - Daily Step Goal (3,000 – 25,000 steps).
  - Weekly Distance Target (5 – 100 km/mi).
  - Weekly Workout Sessions (1 – 10 sessions).
  - Daily Active Minutes (15 – 150 minutes).
- **Streak Tracker**: Calculates consecutive days meeting step goals with encouraging flame milestone indicators.
- **Achievements Engine**: Unlocks badges dynamically evaluated from actual saved IndexedDB records (First Step, Goal Crusher, Active Mover, 7-Day Streak, 10,000 Step Milestone, 50km Pioneer, Workout Dedicated, Half-Marathon Finisher).

### 7. Offline-First PWA & Privacy Guarantee
- **Progressive Web App**: Installable to Android and desktop home screens via Web App Manifest and Service Worker (`sw.js`).
- **Local Storage (IndexedDB via Dexie)**: 100% of activity logs remain securely on your local device.
- **Data Portability**: One-click **JSON Backup Export** and **Restore from Backup**.
- **Unit Preferences**: Seamless switching between Kilometers (km) and Miles (mi).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 with TypeScript |
| **Build Tool & Bundler**| Vite 6 |
| **Styling** | Tailwind CSS (Emerald & Navy color palette) |
| **Icons** | Lucide React |
| **Interactive Charts** | Recharts (Responsive bar, area, and pie charts) |
| **Local Persistence** | IndexedDB via Dexie.js & dexie-react-hooks |
| **Interactive Route Maps** | Leaflet with OpenStreetMap tiles |
| **Celebrations** | Canvas Confetti |
| **PWA** | Web App Manifest, Service Worker cache |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm or pnpm / yarn

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd "fit track"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview the production build:
   ```bash
   npm run preview
   ```

---

## 📐 Formulas & Health Metric Calculations

1. **Pace**:
   $$\text{Pace (min/km)} = \frac{\text{Duration in minutes}}{\text{Distance in km}}$$
   Formatted as `M'SS" /km` or converted to `M'SS" /mi` ($\text{km} \times 1.60934$).

2. **Step Distance**:
   $$\text{Distance (km)} = \frac{\text{Steps} \times 0.76\,\text{m}}{1000}$$

3. **Step Calories (Approximate)**:
   $$\text{Calories} \approx \text{Steps} \times 0.042\,\text{kcal}$$

4. **Workout Calories (MET Estimates)**:
   - Walking: $\approx 65\,\text{kcal/km}$
   - Jogging: $\approx 90\,\text{kcal/km}$
   - Running: $\approx 120\,\text{kcal/km}$
   *All calorie figures are explicitly labeled as approximate estimates.*

---

## 📱 Android Companion App Architecture

For native Android synchronization with Google Health Connect:
```
[Android Hardware Pedometers]
           │
           ▼
[Android Health Connect (androidx.health.connect)]
           │
           ▼
[FitTrack Android Companion App (Kotlin WebView)]
           │  (window.FitTrackAndroidBridge)
           ▼
[FitTrack PWA (IndexedDB Storage & Analytics)]
```

When wrapped inside an Android WebView, FitTrack discovers `window.FitTrackAndroidBridge` and imports background step records directly.
