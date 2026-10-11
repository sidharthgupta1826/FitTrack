import { useState, useRef, useEffect, useCallback } from 'react';
import { ActivityType } from '../types';
import { calculatePace, estimateWorkoutCalories } from '../utils/calculations';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GpsTrackerState {
  status: 'idle' | 'tracking' | 'paused' | 'stopped';
  activityType: ActivityType;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
  elapsedSeconds: number;
  distanceKm: number;
  currentPace: number;
  estimatedCalories: number;
  coordinates: [number, number][]; // [lat, lng]
  currentAccuracyMeters: number | null;
  errorMessage: string | null;
  isSimulated: boolean;
}

/**
 * Haversine formula to compute distance between two [lat, lng] coordinates in kilometers
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGpsTracker() {
  const [state, setState] = useState<GpsTrackerState>({
    status: 'idle',
    activityType: 'walking',
    permissionStatus: 'prompt',
    elapsedSeconds: 0,
    distanceKm: 0,
    currentPace: 0,
    estimatedCalories: 0,
    coordinates: [],
    currentAccuracyMeters: null,
    errorMessage: null,
    isSimulated: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);
  const lastPointRef = useRef<GpsPoint | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const simStepRef = useRef<number>(0);

  // Check initial permission
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        permissionStatus: 'unavailable',
        errorMessage: 'GPS Geolocation is not supported by your browser.',
      }));
    }
  }, []);

  // Update timer during tracking
  useEffect(() => {
    if (state.status === 'tracking') {
      timerRef.current = window.setInterval(() => {
        setState((prev) => {
          const newElapsed = prev.elapsedSeconds + 1;
          const mins = newElapsed / 60;
          const pace = calculatePace(mins, prev.distanceKm);
          const calories = estimateWorkoutCalories(prev.activityType, mins, prev.distanceKm);
          return {
            ...prev,
            elapsedSeconds: newElapsed,
            currentPace: pace,
            estimatedCalories: calories,
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.status]);

  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Filter out low accuracy fixes (> 50 meters)
      if (accuracy > 50) {
        setState((prev) => ({
          ...prev,
          currentAccuracyMeters: Math.round(accuracy),
        }));
        return;
      }

      const newPoint: GpsPoint = {
        latitude,
        longitude,
        accuracy,
        timestamp: position.timestamp,
      };

      setState((prev) => {
        let addedKm = 0;
        if (lastPointRef.current) {
          const dist = haversineDistanceKm(
            lastPointRef.current.latitude,
            lastPointRef.current.longitude,
            latitude,
            longitude
          );
          // Filter tiny GPS drift (< 0.003 km or 3 meters) and impossible speed jumps (> 45 km/h)
          const timeDiffHours = (position.timestamp - lastPointRef.current.timestamp) / 3600000;
          const speedKmH = timeDiffHours > 0 ? dist / timeDiffHours : 0;

          if (dist >= 0.003 && speedKmH < 45) {
            addedKm = dist;
          }
        }

        lastPointRef.current = newPoint;
        const totalDistance = Number((prev.distanceKm + addedKm).toFixed(3));
        const durationMins = prev.elapsedSeconds / 60;
        const pace = calculatePace(durationMins, totalDistance);
        const calories = estimateWorkoutCalories(prev.activityType, durationMins, totalDistance);

        return {
          ...prev,
          distanceKm: totalDistance,
          coordinates: [...prev.coordinates, [latitude, longitude]],
          currentPace: pace,
          estimatedCalories: calories,
          currentAccuracyMeters: Math.round(accuracy),
          errorMessage: null,
        };
      });
    },
    []
  );

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let msg = 'GPS signal lost or unavailable.';
    let permStatus: GpsTrackerState['permissionStatus'] = 'prompt';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission was denied. You can record workouts manually or run a simulated test.';
        permStatus = 'denied';
        break;
      case error.POSITION_UNAVAILABLE:
        msg = 'GPS position is currently unavailable. Ensure device location is enabled.';
        break;
      case error.TIMEOUT:
        msg = 'GPS lock search timed out. Acquiring signal...';
        break;
    }

    setState((prev) => ({
      ...prev,
      permissionStatus: permStatus,
      errorMessage: msg,
    }));
  }, []);

  const startTracking = (type: ActivityType = 'walking') => {
    if (!('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        permissionStatus: 'unavailable',
        errorMessage: 'Geolocation is not supported on this browser.',
      }));
      return;
    }

    startTimeRef.current = new Date();
    lastPointRef.current = null;

    setState((prev) => ({
      ...prev,
      status: 'tracking',
      activityType: type,
      permissionStatus: 'granted',
      errorMessage: null,
      isSimulated: false,
    }));

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );
  };

  /**
   * Start a simulated workout along a realistic outdoor park trail
   * (Essential for desktop testing or indoor demonstration)
   */
  const startSimulatedTracking = (type: ActivityType = 'running') => {
    startTimeRef.current = new Date();
    simStepRef.current = 0;

    // Base coordinates (Central Park loop example: 40.785091, -73.968285)
    const baseLat = 40.785091;
    const baseLng = -73.968285;

    setState({
      status: 'tracking',
      activityType: type,
      permissionStatus: 'granted',
      elapsedSeconds: 0,
      distanceKm: 0.05,
      currentPace: 5.2,
      estimatedCalories: 6,
      coordinates: [[baseLat, baseLng]],
      currentAccuracyMeters: 4,
      errorMessage: null,
      isSimulated: true,
    });

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    simulationIntervalRef.current = window.setInterval(() => {
      simStepRef.current += 1;
      const angle = (simStepRef.current * 8 * Math.PI) / 180;
      const nextLat = baseLat + Math.sin(angle) * 0.0035 + (simStepRef.current * 0.0001);
      const nextLng = baseLng + Math.cos(angle) * 0.0035;

      setState((prev) => {
        if (prev.status !== 'tracking') return prev;
        const newDist = Number((prev.distanceKm + 0.015).toFixed(3));
        const durationMins = prev.elapsedSeconds / 60;
        const pace = calculatePace(durationMins, newDist);
        const calories = estimateWorkoutCalories(prev.activityType, durationMins, newDist);

        return {
          ...prev,
          distanceKm: newDist,
          currentPace: pace > 0 ? pace : 5.15,
          estimatedCalories: calories,
          coordinates: [...prev.coordinates, [nextLat, nextLng]],
        };
      });
    }, 2000);
  };

  const pauseTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setState((prev) => ({ ...prev, status: 'paused' }));
  };

  const resumeTracking = () => {
    setState((prev) => ({ ...prev, status: 'tracking' }));
    if (state.isSimulated) {
      simulationIntervalRef.current = window.setInterval(() => {
        simStepRef.current += 1;
        const baseLat = 40.785091;
        const baseLng = -73.968285;
        const angle = (simStepRef.current * 8 * Math.PI) / 180;
        const nextLat = baseLat + Math.sin(angle) * 0.0035 + (simStepRef.current * 0.0001);
        const nextLng = baseLng + Math.cos(angle) * 0.0035;

        setState((prev) => {
          if (prev.status !== 'tracking') return prev;
          const newDist = Number((prev.distanceKm + 0.015).toFixed(3));
          const durationMins = prev.elapsedSeconds / 60;
          const pace = calculatePace(durationMins, newDist);
          const calories = estimateWorkoutCalories(prev.activityType, durationMins, newDist);

          return {
            ...prev,
            distanceKm: newDist,
            currentPace: pace > 0 ? pace : 5.15,
            estimatedCalories: calories,
            coordinates: [...prev.coordinates, [nextLat, nextLng]],
          };
        });
      }, 2000);
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000,
        }
      );
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setState((prev) => ({ ...prev, status: 'stopped' }));
  };

  const resetTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationIntervalRef.current !== null) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    lastPointRef.current = null;
    startTimeRef.current = null;
    simStepRef.current = 0;
    setState({
      status: 'idle',
      activityType: 'walking',
      permissionStatus: 'prompt',
      elapsedSeconds: 0,
      distanceKm: 0,
      currentPace: 0,
      estimatedCalories: 0,
      coordinates: [],
      currentAccuracyMeters: null,
      errorMessage: null,
      isSimulated: false,
    });
  };

  return {
    state,
    startTracking,
    startSimulatedTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking,
    startTime: startTimeRef.current,
  };
}
