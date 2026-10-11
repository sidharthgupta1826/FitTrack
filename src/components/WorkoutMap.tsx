import React, { useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WorkoutMapProps {
  coordinates: [number, number][]; // [lat, lng]
  interactive?: boolean;
  height?: string;
  isLive?: boolean;
}

export const WorkoutMap: React.FC<WorkoutMapProps> = ({
  coordinates,
  interactive = true,
  height = '280px',
  isLive = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const defaultCenter: [number, number] =
        coordinates.length > 0 ? coordinates[0] : [37.7749, -122.4194];

      const map = L.map(mapContainerRef.current, {
        zoomControl: interactive,
        attributionControl: false,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: false,
      }).setView(defaultCenter, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    if (coordinates.length > 0) {
      // Draw Start Marker
      if (!startMarkerRef.current && coordinates.length > 0) {
        const startIcon = L.divIcon({
          className: 'custom-gps-start-pin',
          html: `<div style="background-color:#10B981; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 0 8px rgba(16,185,129,0.7);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        startMarkerRef.current = L.marker(coordinates[0], { icon: startIcon }).addTo(map);
      }

      // Draw Polyline
      if (!polylineRef.current) {
        polylineRef.current = L.polyline(coordinates, {
          color: '#059669',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(coordinates);
      }

      // Latest Position Marker
      const latestCoord = coordinates[coordinates.length - 1];
      const customIcon = L.divIcon({
        className: 'custom-gps-pin',
        html: `<div style="background-color:#059669; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(5,150,105,0.6);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (!markerRef.current) {
        markerRef.current = L.marker(latestCoord, { icon: customIcon }).addTo(map);
      } else {
        markerRef.current.setLatLng(latestCoord);
      }

      if (coordinates.length > 1) {
        map.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
      } else {
        map.setView(latestCoord, 16);
      }
    }

    // Invalidate size in case of tab switch / animation
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [coordinates, interactive]);

  // Clean map cleanup on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  if (coordinates.length === 0) {
    return (
      <div
        className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400"
        style={{ height }}
      >
        <Navigation className="w-8 h-8 text-emerald-500/60 mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-slate-600">Awaiting GPS Location Lock</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Your path and distance will be plotted in real-time as GPS coordinates update.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {isLive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-xs font-semibold text-emerald-700 border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Live GPS Route Active
        </div>
      )}
    </div>
  );
};
