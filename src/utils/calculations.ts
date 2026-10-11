import { ActivityType } from '../types';

/**
 * Format a number with thousands commas (e.g., 8,420)
 */
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Calculate pace in minutes per kilometer
 * Pace = Duration in minutes / Distance in kilometers
 */
export function calculatePace(durationMinutes: number, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return Number((durationMinutes / distanceKm).toFixed(2));
}

/**
 * Format pace as M'SS" /km or /mi
 */
export function formatPace(paceMinPerKm: number, unit: 'km' | 'miles' = 'km'): string {
  if (!paceMinPerKm || paceMinPerKm <= 0 || !isFinite(paceMinPerKm)) return `--'--" /${unit}`;
  
  const pace = unit === 'miles' ? paceMinPerKm * 1.60934 : paceMinPerKm;
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  
  const formattedSec = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}'${formattedSec}" /${unit}`;
}

/**
 * Calculate distance from steps (approx. 0.76m average stride length)
 */
export function stepsToKm(steps: number): number {
  if (steps <= 0) return 0;
  return Number(((steps * 0.76) / 1000).toFixed(2));
}

/**
 * Estimate calories burned from steps (approx. 0.042 kcal per step for 70kg person)
 */
export function stepsToCalories(steps: number): number {
  if (steps <= 0) return 0;
  return Math.round(steps * 0.042);
}

/**
 * Estimate active minutes from daily steps
 */
export function stepsToActiveMinutes(steps: number): number {
  if (steps <= 0) return 0;
  // Based on brisk walking cadence of approx 105 steps/min
  return Math.min(Math.round(steps / 105), 300);
}

/**
 * Estimate calories burned for a specific workout
 * Based on MET values:
 * - Walking: 3.5 MET (~60 kcal/km)
 * - Jogging: 7.0 MET (~90 kcal/km)
 * - Running: 9.8 MET (~120 kcal/km)
 */
export function estimateWorkoutCalories(
  activityType: ActivityType,
  durationMinutes: number,
  distanceKm: number
): number {
  if (durationMinutes <= 0 && distanceKm <= 0) return 0;
  
  let ratePerKm = 65;
  let ratePerMin = 4.5;
  
  if (activityType === 'jogging') {
    ratePerKm = 90;
    ratePerMin = 8.5;
  } else if (activityType === 'running') {
    ratePerKm = 120;
    ratePerMin = 12.0;
  }
  
  if (distanceKm > 0) {
    return Math.round(distanceKm * ratePerKm);
  }
  return Math.round(durationMinutes * ratePerMin);
}

/**
 * Format distance according to unit preference
 */
export function formatDistance(distanceKm: number, unit: 'km' | 'miles' = 'km'): string {
  if (unit === 'miles') {
    const miles = distanceKm * 0.621371;
    return `${miles.toFixed(2)} mi`;
  }
  return `${distanceKm.toFixed(2)} km`;
}

/**
 * Format duration minutes to human readable string (e.g. 45m or 1h 15m)
 */
export function formatDuration(durationMinutes: number): string {
  if (!durationMinutes || durationMinutes <= 0) return '0m';
  const hrs = Math.floor(durationMinutes / 60);
  const mins = Math.round(durationMinutes % 60);
  
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
}

/**
 * Get current date string in YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD into readable date (e.g. "Monday, Oct 11, 2026")
 */
export function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format short date (e.g. "Mon, Oct 11")
 */
export function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get Monday and Sunday for the week containing a specific date
 */
export function getMondayToSundayWeek(referenceDate: Date = new Date()): {
  monday: Date;
  sunday: Date;
  weekDates: string[];
} {
  const d = new Date(referenceDate);
  const day = d.getDay();
  // In JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  // Distance to Monday:
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const yr = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, '0');
    const da = String(cur.getDate()).padStart(2, '0');
    weekDates.push(`${yr}-${mo}-${da}`);
  }
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { monday, sunday, weekDates };
}

/**
 * Format date to YYYY-MM-DD
 */
export function toDateString(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}
