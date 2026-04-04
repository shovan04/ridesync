import L from "leaflet";
import type { Rider } from "../types/rider";

export function calculateMapCenter(riders: Rider[]) {
  const lat =
    riders.reduce((sum, r) => sum + r.lat, 0) / riders.length || 28.7041;

  const lng =
    riders.reduce((sum, r) => sum + r.lng, 0) / riders.length || 77.1025;

  return [lat, lng] as [number, number];
}

export function createRiderMarker(rider: Rider) {
  const isAlert = rider.status === "off-route";
  const color = isAlert ? "#ff4444" : "#00E5FF";

  return L.divIcon({
    html: `
      <div class="flex flex-col items-center">
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full border-2 animate-pulse"
            style="border-color: ${color}; opacity: 0.3;"></div>
          <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style="background-color: ${color};">
            ${rider.name.charAt(0)}
          </div>
        </div>
      </div>
    `,
    className: "rider-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}