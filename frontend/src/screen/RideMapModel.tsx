import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RideMapModalProps } from "../data/map";
import { calculateMapCenter, createRiderMarker } from "../components/RideMapModal";

export default function RideMapModal({ riders, isOpen, onClose, startPoint, endPoint }: RideMapModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const routeLineRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<Array<L.Marker | L.CircleMarker>>([]);

  // Draw route on map
  const drawRoute = (start: string, end: string) => {
    if (!map.current) return;

    // Remove existing route
    if (routeLineRef.current) {
      routeLineRef.current.remove();
    }
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    try {
      const [startLat, startLng] = start.split(',').map(Number);
      const [endLat, endLng] = end.split(',').map(Number);

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        return;
      }

      // Draw route line
      routeLineRef.current = L.polyline(
        [[startLat, startLng], [endLat, endLng]],
        {
          color: '#00E5FF',
          weight: 4,
          opacity: 0.8,
          dashArray: '12, 10',
          lineCap: 'round',
          lineJoin: 'round',
        }
      ).addTo(map.current!);

      // Start point marker
      L.circleMarker([startLat, startLng], {
        radius: 8,
        fillColor: '#22c55e',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .addTo(map.current!)
        .bindPopup('<b>🟢 Start</b>')
        .openPopup();

      // End point marker
      L.circleMarker([endLat, endLng], {
        radius: 8,
        fillColor: '#ef4444',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .addTo(map.current!)
        .bindPopup('<b>🔴 End</b>');

      console.log('✅ Route drawn on modal map');
    } catch (error) {
      console.error('❌ Error drawing route:', error);
    }
  };

  useEffect(() => {
    console.log('📱 Modal useEffect triggered:', { isOpen, ridersCount: riders.length });
    
    if (!isOpen) {
      // Clean up map when modal is closed
      if (map.current) {
        map.current.remove();
        map.current = null;
        markersRef.current = {};
        routeLineRef.current = null;
      }
      return;
    }

    if (!mapContainer.current || map.current) {
      console.log('⚠️ Map container not ready or map already exists');
      return;
    }

    console.log('🗺️ Initializing modal map with', riders.length, 'riders');

    // Small delay to ensure modal is fully rendered
    setTimeout(() => {
      if (!mapContainer.current) return;

      // Initialize map - center on first rider or average of all riders
      const [centerLat, centerLng] = calculateMapCenter(riders);
      console.log('📍 Map center:', { centerLat, centerLng });

      map.current = L.map(mapContainer.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: true, // Enable zoom controls in modal
      });

      // Dark mode tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map.current);

      // Add riders markers
      console.log('🚴 Adding', riders.length, 'rider markers');
      riders.forEach((rider) => {
        const isAlert = rider.status === "off-route";

        // Create custom icon
        const icon = createRiderMarker(rider);

        const marker = L.marker([rider.lat, rider.lng], { icon }).addTo(
          map.current!
        );

        // Popup with rider info
        const popupContent = `
          <div class="bg-[#111] border border-[#1e1e1e] rounded-lg p-3 text-sm min-w-[160px]"
            style="font-family: 'Barlow', sans-serif;">
            <div class="text-[#00E5FF] font-semibold text-base">${rider.name}</div>
            <div class="text-[#888] text-xs mt-1">
              ${isAlert ? `<div class="text-[#ff4444]">Off route · ${rider.distanceBehind}</div>` : '<div class="text-[#00E5FF]">On route</div>'}
            </div>
            <div class="text-[#666] text-xs mt-2">
              ${rider.lat.toFixed(4)}° N<br/>
              ${rider.lng.toFixed(4)}° E
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { className: "custom-popup" });
        markersRef.current[rider.id] = marker;
        console.log(`✅ Marker added for ${rider.name} at [${rider.lat}, ${rider.lng}]`);
      });

      // Draw route if start/end points provided
      if (startPoint && endPoint) {
        drawRoute(startPoint, endPoint);
      }

      // Fit bounds to all markers
      if (riders.length > 0) {
        const bounds = L.latLngBounds(riders.map((r) => [r.lat, r.lng]));
        map.current.fitBounds(bounds, { padding: [80, 80] });
        console.log('🗺️ Map fitted to show all riders');
      }

      // Force map to recalculate size after initialization
      setTimeout(() => {
        if (map.current) {
          map.current.invalidateSize();
          console.log('📐 Modal map size invalidated');
        }
      }, 200);
    }, 100);

    return () => {
      // Cleanup is now handled in the useEffect when !isOpen
    };
  }, [isOpen, riders, startPoint, endPoint]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full bg-[#0A0A0A] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] bg-[#0A0A0A]">
          <div className="flex flex-col gap-0.5">
            <h2
              className="text-[#00E5FF] font-bold text-base"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              GROUP ROUTE
            </h2>
            <p className="text-[#666] text-xs tracking-[1px]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {riders.length} RIDER{riders.length !== 1 ? "S" : ""} LIVE
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#888] hover:bg-[#222] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Rider pills */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-[#1e1e1e] bg-[#0A0A0A]">
          {riders.map((rider) => {
            const isAlert = rider.status === "off-route";
            return (
              <div
                key={rider.id}
                className={`flex items-center gap-2 rounded-full px-3 py-2 flex-shrink-0 border ${
                  isAlert
                    ? "bg-[#1a0a0a] border-[#ff4444]"
                    : "bg-[#111] border-[#222]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isAlert ? "bg-[#ff4444]" : "bg-[#00E5FF]"
                  }`}
                  style={isAlert ? { animation: "pulse 0.8s infinite" } : undefined}
                />
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    isAlert ? "text-[#ff6666]" : "text-[#ccc]"
                  }`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {rider.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div ref={mapContainer} className="flex-1 relative bg-[#0d0d0d]" style={{ width: '100%' }} />
      </div>

      <style>{`
        .leaflet-container {
          background-color: #0d0d0d;
          font-family: 'Barlow', sans-serif;
        }

        .leaflet-control-zoom {
          display: none;
        }

        .custom-popup .leaflet-popup-content-wrapper {
          background-color: #111 !important;
          border: 1px solid #1e1e1e !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8) !important;
          padding: 0 !important;
        }

        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }

        .custom-popup .leaflet-popup-tip {
          background-color: #111 !important;
          border-color: #1e1e1e !important;
        }

        .rider-marker {
          filter: drop-shadow(0 2px 8px rgba(0, 229, 255, 0.3));
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
