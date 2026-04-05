import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address?: string) => void;
  title: string;
  initialPosition?: [number, number];
}

function LocationMarker({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position === null ? null : (
    <Marker position={position}>
    </Marker>
  );
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelect,
  title,
  initialPosition = [28.7041, 77.1025], // Default to Delhi
}: LocationPickerModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedLocation(null);
      setAddress("");
    }
  }, [isOpen]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });

    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation.lat, selectedLocation.lng, address);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2
            className="text-white text-xl font-semibold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Map */}
        <div className="h-96 w-full">
          <MapContainer
            center={initialPosition}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker onLocationSelect={handleLocationSelect} />
          </MapContainer>
        </div>

        {/* Selected location info */}
        {selectedLocation && (
          <div className="px-6 py-3 bg-[#0A0A0A] border-t border-[#1e1e1e]">
            <p className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-1"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Selected Coordinates
            </p>
            <p className="text-[#00E5FF] text-sm font-mono">
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
            {address && (
              <p className="text-[#888] text-xs mt-1 line-clamp-2">{address}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="px-6 py-3 bg-[#0d2a2e]/30 border-t border-[#1e1e1e]">
          <p className="text-[#444] text-xs">
            💡 Click anywhere on the map to select a location
          </p>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#1e1e1e]">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#222] text-[#888] font-semibold transition-all active:scale-95 hover:border-[#333] hover:text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
              selectedLocation
                ? "bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
                : "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
            }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
