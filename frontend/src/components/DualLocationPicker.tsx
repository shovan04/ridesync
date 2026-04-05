import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom icons for start and end
const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// Default blue marker for stops
const stopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

interface LocationPoint {
  lat: number;
  lng: number;
  address?: string;
}

interface StopPoint extends LocationPoint {
  title: string;
  stopType: 'fuel' | 'food' | 'rest' | 'tea' | 'other';
}

interface DualLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (start: LocationPoint, end: LocationPoint, stops: StopPoint[]) => void;
  initialPosition?: [number, number];
}

function MapClickHandler({
  startPoint,
  endPoint,
  clickMode,
  onStartSelect,
  onEndSelect,
  onStopSelect,
}: {
  startPoint: LocationPoint | null;
  endPoint: LocationPoint | null;
  clickMode: 'start' | 'end' | 'stop';
  onStartSelect: (lat: number, lng: number) => void;
  onEndSelect: (lat: number, lng: number) => void;
  onStopSelect: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (!startPoint) {
        onStartSelect(e.latlng.lat, e.latlng.lng);
      } else if (!endPoint) {
        onEndSelect(e.latlng.lat, e.latlng.lng);
      } else {
        onStopSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

// Custom control for current location button
function CurrentLocationButton({
  onGetCurrentLocation,
}: {
  onGetCurrentLocation: () => void;
}) {
  const handleButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onGetCurrentLocation();
  };

  return (
    <div 
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleButtonClick}
        onMouseDown={handleButtonClick}
        onTouchStart={handleButtonClick}
        className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-lg border border-gray-300 transition-colors cursor-pointer"
        title="Go to my location"
        style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  );
}

export default function DualLocationPicker({
  isOpen,
  onClose,
  onSelect,
  initialPosition = [28.7041, 77.1025], // Default to Delhi
}: DualLocationPickerProps) {
  const [startPoint, setStartPoint] = useState<LocationPoint | null>(null);
  const [endPoint, setEndPoint] = useState<LocationPoint | null>(null);
  const [stops, setStops] = useState<StopPoint[]>([]);
  const [clickMode, setClickMode] = useState<'start' | 'end' | 'stop'>('start');
  const [showStopModal, setShowStopModal] = useState(false);
  const [tempStopLocation, setTempStopLocation] = useState<{lat: number; lng: number} | null>(null);
  const mapRef = useRef<any>(null); // Ref to access Leaflet map instance
  
  // Stop form state
  const [stopTitle, setStopTitle] = useState('');
  const [stopType, setStopType] = useState<'fuel' | 'food' | 'rest' | 'tea' | 'other'>('rest');

  useEffect(() => {
    if (!isOpen) {
      setStartPoint(null);
      setEndPoint(null);
      setStops([]);
      setClickMode('start');
      setShowStopModal(false);
      setTempStopLocation(null);
      setStopTitle('');
      setStopType('rest');
    }
  }, [isOpen]);

  const handleStartSelect = async (lat: number, lng: number) => {
    const point: LocationPoint = { lat, lng };
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        point.address = data.display_name;
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
    
    setStartPoint(point);
    setClickMode('end'); // After setting start, next click sets end
  };

  const handleEndSelect = async (lat: number, lng: number) => {
    const point: LocationPoint = { lat, lng };
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        point.address = data.display_name;
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
    
    setEndPoint(point);
    setClickMode('stop'); // After setting end, subsequent clicks add stops
  };
  
  const handleMapClickForStop = (lat: number, lng: number) => {
    setTempStopLocation({ lat, lng });
    setShowStopModal(true);
  };
  
  const handleAddStop = async () => {
    if (!tempStopLocation || !stopTitle.trim()) return;
    
    const stop: StopPoint = {
      lat: tempStopLocation.lat,
      lng: tempStopLocation.lng,
      title: stopTitle.trim(),
      stopType,
    };
    
    // Reverse geocode
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${tempStopLocation.lat}&lon=${tempStopLocation.lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        stop.address = data.display_name;
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
    
    setStops([...stops, stop]);
    setShowStopModal(false);
    setTempStopLocation(null);
    setStopTitle('');
    setStopType('rest');
  };
  
  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };
  
  const handleGoToCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log('Got location:', lat, lng);
        console.log('Map ref exists:', !!mapRef.current);
        // Fly to the location using map ref
        if (mapRef.current) {
          console.log('Flying to location...');
          mapRef.current.flyTo([lat, lng], 15, {
            duration: 1.5,
            easeLinearity: 0.25
          });
          console.log('Fly command sent');
        } else {
          console.error('Map ref is null!');
        }
      },
      (error) => {
        console.error('Geolocation error:', error.code, error.message);
        // Show appropriate message based on error type
        switch(error.code) {
          case 1: // PERMISSION_DENIED
            alert('Location permission was denied. Please enable location access in your browser settings.');
            break;
          case 2: // POSITION_UNAVAILABLE
            alert('Unable to determine your location. Please try again.');
            break;
          case 3: // TIMEOUT
            alert('Location request timed out. Please try again.');
            break;
          default:
            alert('An unknown error occurred while getting your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirm = () => {
    if (startPoint && endPoint) {
      onSelect(startPoint, endPoint, stops);
      onClose();
    }
  };

  const handleReset = () => {
    setStartPoint(null);
    setEndPoint(null);
    setStops([]);
    setClickMode('start');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <h2
            className="text-white text-xl font-semibold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Select Route on Map
          </h2>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Instructions Bar */}
        <div className="px-6 py-3 bg-[#0A0A0A] border-b border-[#1e1e1e] flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-xs text-[#888]">
                {startPoint ? "✓ Start set" : "Click to set start"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-xs text-[#888]">
                {endPoint ? "✓ End set" : "Click to set end"}
              </span>
            </div>
          </div>
          {(startPoint || endPoint) && (
            <button
              onClick={handleReset}
              className="text-xs text-[#888] hover:text-white transition-colors px-3 py-1 rounded border border-[#222] hover:border-[#333]"
            >
              Reset
            </button>
          )}
        </div>

        {/* Map */}
        <div className="w-full relative" style={{ height: '500px' }}>
          <MapContainer
            center={initialPosition}
            zoom={15}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              startPoint={startPoint}
              endPoint={endPoint}
              clickMode={clickMode}
              onStartSelect={handleStartSelect}
              onEndSelect={handleEndSelect}
              onStopSelect={handleMapClickForStop}
            />
            
            <CurrentLocationButton onGetCurrentLocation={handleGoToCurrentLocation} />
            
            {startPoint && (
              <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>Start Point</strong>
                    {startPoint.address && <p className="mt-1 text-gray-600">{startPoint.address}</p>}
                  </div>
                </Popup>
              </Marker>
            )}
            
            {endPoint && (
              <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>End Point</strong>
                    {endPoint.address && <p className="mt-1 text-gray-600">{endPoint.address}</p>}
                  </div>
                </Popup>
              </Marker>
            )}
            
            {stops.map((stop, index) => (
              <Marker key={index} position={[stop.lat, stop.lng]} icon={stopIcon}>
                <Popup>
                  <div className="text-xs">
                    <strong>Stop {index + 1}: {stop.title}</strong>
                    <p className="text-gray-500 capitalize">{stop.stopType}</p>
                    {stop.address && <p className="mt-1 text-gray-600">{stop.address}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Selected locations info */}
        {(startPoint || endPoint || stops.length > 0) && (
          <div className="px-6 py-3 bg-[#0A0A0A] border-t border-[#1e1e1e] space-y-2 max-h-48 overflow-y-auto">
            {startPoint && (
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></span>
                <div className="flex-1">
                  <p className="text-[9px] tracking-[1.5px] text-green-500 uppercase font-semibold"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Start
                  </p>
                  <p className="text-[#888] text-xs">{startPoint.address || `${startPoint.lat.toFixed(6)}, ${startPoint.lng.toFixed(6)}`}</p>
                </div>
              </div>
            )}
            {endPoint && (
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                <div className="flex-1">
                  <p className="text-[9px] tracking-[1.5px] text-red-500 uppercase font-semibold"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    End
                  </p>
                  <p className="text-[#888] text-xs">{endPoint.address || `${endPoint.lat.toFixed(6)}, ${endPoint.lng.toFixed(6)}`}</p>
                </div>
              </div>
            )}
            {stops.map((stop, index) => (
              <div key={index} className="flex items-start gap-2 bg-[#111] p-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] tracking-[1.5px] text-blue-500 uppercase font-semibold"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      Stop {index + 1}
                    </p>
                    <button
                      onClick={() => handleRemoveStop(index)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-900/20"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-white text-xs font-medium">{stop.title}</p>
                  <p className="text-[#666] text-[10px] capitalize">{stop.stopType}</p>
                  {stop.address  && <p className="text-[#888] text-[10px] mt-0.5 truncate">{stop.address}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

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
            disabled={!startPoint || !endPoint}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
              startPoint && endPoint
                ? "bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
                : "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
            }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
          >
            Confirm Route{stops.length > 0 && ` (${stops.length} stops)`}
          </button>
        </div>
      </div>
      
      {/* Add Stop Modal */}
      {showStopModal && tempStopLocation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-white text-lg font-semibold mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Add Stop Point
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Stop Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Fuel Station, Restaurant"
                  value={stopTitle}
                  onChange={(e) => setStopTitle(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors placeholder:text-[#333]"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Stop Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fuel', 'food', 'rest', 'tea', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setStopType(type)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium capitalize transition-all break-words ${
                        stopType === type
                          ? 'bg-[#00E5FF] text-black'
                          : 'bg-[#0A0A0A] border border-[#222] text-[#888] hover:border-[#333]'
                      }`}
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStopModal(false);
                    setTempStopLocation(null);
                    setStopTitle('');
                    setStopType('rest');
                  }}
                  className="flex-1 py-3 rounded-xl border border-[#222] text-[#888] font-semibold transition-all active:scale-95 hover:border-[#333] hover:text-white"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStop}
                  disabled={!stopTitle.trim()}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
                    stopTitle.trim()
                      ? 'bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90'
                      : 'bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed'
                  }`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
                >
                  Add Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
