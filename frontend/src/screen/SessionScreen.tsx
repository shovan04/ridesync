import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/bottomNav";
import type { NavTab } from "../components/bottomNav";
import { getActiveTab } from "../utils/getActiveTab";
import { createRide, joinRide, addRideStop } from "../services/api";
import DualLocationPicker from "../components/DualLocationPicker";

export default function SessionScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  
  // Location selection state
  const [startLocation, setStartLocation] = useState<{lat: number; lng: number; address?: string} | null>(null);
  const [endLocation, setEndLocation] = useState<{lat: number; lng: number; address?: string} | null>(null);
  const [stops, setStops] = useState<Array<{lat: number; lng: number; title: string; stopType: string; address?: string}>>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  
  // Modal state
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdRideData, setCreatedRideData] = useState<any>(null);
  
  // Join ride state
  const [joinCode, setJoinCode] = useState("");
  const [joiningRide, setJoiningRide] = useState(false);
  const [joinError, setJoinError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch user location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Got initial location:', position.coords.latitude, position.coords.longitude);
          setUserPosition([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          // Silently fall back to default location if permission denied or unavailable
          if (error.code !== 1) { // Don't log if user denied (code 1)
            console.error('Error getting location:', error.code, error.message);
          }
          setUserPosition([28.7041, 77.1025]); // Default to Delhi
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Default to Delhi if geolocation not supported
      setUserPosition([28.7041, 77.1025]);
    }
  }, []);

  function handleCodeInput(index: number, value: string) {
    const char = value.slice(-1);
    const updated = [...code];
    updated[index] = char;
    setCode(updated);
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }
  
  async function handleJoinRide() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setJoinError('Please create a profile first');
      return;
    }

    if (!joinCode.trim() || joinCode.length !== 6) {
      setJoinError('Please enter a valid 6-digit ride code');
      return;
    }

    setJoiningRide(true);
    setJoinError('');

    try {
      const response = await joinRide({
        userId,
        rideCode: joinCode
      });

      console.log('Joined ride:', response);
      
      // Show message if already joined
      if (response.alreadyJoined) {
        console.log(`Already a ${response.role} in this ride`);
      }
      
      // Save ride code and redirect to map tab
      localStorage.setItem('currentRideCode', joinCode);
      navigate('/'); // Redirect to map tab
    } catch (err: any) {
      console.error('Error joining ride:', err);
      setJoinError(err.message || 'Invalid ride code. Please check and try again.');
    } finally {
      setJoiningRide(false);
    }
  }

  async function handleCreateRide() {
    const userId = localStorage.getItem('userId');
    console.log('Checking userId from localStorage:', userId);
    
    if (!userId) {
      setError('Please create a profile first');
      return;
    }

    if (!startLocation || !endLocation) {
      setError('Please select both start and end locations on the map');
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccessMessage(null);

    try {
      // Format coordinates as "lat,lng" for backend
      const startPoint = `${startLocation.lat},${startLocation.lng}`;
      const endPoint = `${endLocation.lat},${endLocation.lng}`;

      console.log('=== Creating Ride ===');
      console.log('User ID:', userId);
      console.log('Start Point:', startPoint);
      console.log('End Point:', endPoint);
      console.log('Stops count:', stops.length);

      const response = await createRide({
        userId,
        startPoint,
        endPoint
      });

      console.log('Ride created:', response);
      
      // Add stops if any
      if (stops.length > 0 && response.rideId) {
        console.log(`Adding ${stops.length} stops to ride...`);
        
        // Add each stop sequentially
        for (let i = 0; i < stops.length; i++) {
          const stop = stops[i];
          await addRideStop({
            rideId: response.rideId,
            title: stop.title,
            stopType: stop.stopType as 'fuel' | 'food' | 'rest' | 'tea' | 'other',
            stopPoint: stop.address || `${stop.lat.toFixed(6)},${stop.lng.toFixed(6)}`,
            latitude: stop.lat.toString(),
            longitude: stop.lng.toString(),
            stopOrder: i + 1
          });
        }
        
        console.log('All stops added successfully');
      }
      
      // Show success message with ride code only
      setSuccessMessage(`Ride created successfully!`);
      setCreatedRideData(response);
      
      // Save ride code to localStorage for map tab
      if (response.code) {
        localStorage.setItem('currentRideCode', response.code);
      }
      
      // Clear selections after successful creation
      setStartLocation(null);
      setEndLocation(null);
      setStops([]);
      
      // Auto-hide success message after 10 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setCreatedRideData(null);
      }, 10000);
    } catch (err: any) {
      console.error('Error creating ride:', err);
      // Display detailed error message including validation errors
      const errorMessage = err.message || 'Failed to create ride. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }

  const handleTabChange = (tab: NavTab) => {
    const routes: Record<NavTab, string> = {
      map: "/",
      group: "/session",
      safety: "/alert/off-route",
      profile: "/profile",
    };
    navigate(routes[tab]);
  };

  return (
    <div
      className="flex flex-col w-full h-screen bg-[#0A0A0A] overflow-hidden"
      style={{ fontFamily: "'Barlow', sans-serif" }}
    >
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <button className="flex flex-col gap-1.5">
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
        </button>
        <span
          className="text-[#00E5FF] tracking-widest text-2xl"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          RideSync
        </span>
        <div className="w-9 h-9 rounded-full border border-[#00E5FF] bg-[#1a1a1a] flex items-center justify-center text-[#00E5FF] text-xs font-semibold">
          YS
        </div>
      </div>

      {/* PAGE TITLE */}
      <div className="px-5 pb-5">
        <h1
          className="text-white text-4xl leading-none mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px" }}
        >
          Start a Ride
        </h1>
        <p className="text-[#444] text-sm">
          Join an existing group or create your own.
        </p>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">

        {/* JOIN RIDE CARD */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-5">
          {/* Card header */}
          <div className="flex items-center gap-2.5">
            <span className="text-[#00E5FF]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 10a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6 13a5 5 0 008 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <span
              className="text-white text-lg font-semibold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Join Ride
            </span>
          </div>

          {/* Code label */}
          <div>
            <p
              className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-3"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Enter 6-digit session code
            </p>

            {/* Code inputs */}
            <div className="flex gap-2 justify-center">
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  maxLength={1}
                  value={joinCode[i] || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, ''); // Only alphanumeric (both cases)
                    const newCode = joinCode.split('');
                    newCode[i] = value;
                    setJoinCode(newCode.join('').slice(0, 6));
                    if (value && i < 5) {
                      inputRefs.current[i + 1]?.focus();
                    }
                  }}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className={`w-12 h-14 rounded-xl text-center text-xl font-bold bg-[#0A0A0A] border outline-none transition-all
                    ${(joinCode[i])
                      ? "border-[#00E5FF] text-[#00E5FF]"
                      : "border-[#222] text-[#333]"
                    }
                    focus:border-[#00E5FF] focus:text-[#00E5FF]`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", caretColor: "#00E5FF" }}
                />
              ))}
            </div>
          </div>

          <p className="text-[#444] text-xs leading-relaxed -mt-1">
            Ask your ride leader for the session code to sync live positions.
          </p>

          {/* Connect button */}
          <button
            onClick={handleJoinRide}
            disabled={joiningRide || joinCode.length !== 6}
            className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold text-base transition-all active:scale-95
              ${joiningRide || joinCode.length !== 6
                ? "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
                : "bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
              }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px", fontSize: "16px" }}
          >
            {joiningRide ? "Joining..." : "Connect to Session"}
          </button>
          
          {/* Join error message */}
          {joinError && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500 rounded-lg py-2">{joinError}</p>
          )}
        </div>

        {/* CREATE RIDE CARD */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 shadow-lg flex flex-col gap-4">
            {/* Card header */}
            <div className="flex items-center gap-2.5">
              <span className="text-[#00E5FF]">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span
                className="text-white text-lg font-semibold"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Create Ride
              </span>
            </div>

            {/* Route Selection */}
            <div>
              <p
                className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Select Route on Map
              </p>
              <button
                onClick={() => setIsRoutePickerOpen(true)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-4 py-3.5 text-left transition-all hover:border-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] group"
                style={{ fontFamily: "'Barlow', sans-serif" }}
              >
                {startLocation && endLocation ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 mt-1"></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#00E5FF] text-xs font-medium">Start Point</p>
                        <p className="text-[#888] text-xs truncate">
                          {startLocation.address || `${startLocation.lat.toFixed(4)}, ${startLocation.lng.toFixed(4)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 mt-1"></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#00E5FF] text-xs font-medium">End Point</p>
                        <p className="text-[#888] text-xs truncate">
                          {endLocation.address || `${endLocation.lat.toFixed(4)}, ${endLocation.lng.toFixed(4)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-[#00E5FF] text-sm font-medium mb-1">📍 Click to select route on map</p>
                    <p className="text-[#444] text-xs">Set both start and end points</p>
                  </div>
                )}
              </button>
            </div>

            {/* Success message */}
            {successMessage && createdRideData && (
              <div className="bg-green-900/20 border border-green-500 rounded-xl p-6 space-y-3">
                <p className="text-green-400 text-sm font-semibold text-center">{successMessage}</p>
                <div className="text-center">
                  <p className="text-green-500 text-xs uppercase tracking-wider mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Room Code</p>
                  <p className="font-mono font-bold text-green-200 text-4xl tracking-widest">{createdRideData.code}</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500 rounded-lg py-2">{error}</p>
            )}

            {/* Create Ride button */}
            <button
              onClick={handleCreateRide}
              disabled={isCreating || !startLocation || !endLocation}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold text-base transition-all active:scale-95
                ${isCreating || !startLocation || !endLocation
                  ? "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
                  : "bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
                }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px", fontSize: "16px" }}
            >
              {isCreating ? "Creating..." : "Create Ride"}
            </button>
          </div>
        </div>

      </div>

      {/* Dual Location Picker Modal */}
      <DualLocationPicker
        isOpen={isRoutePickerOpen}
        onClose={() => setIsRoutePickerOpen(false)}
        onSelect={(start, end, selectedStops) => {
          setStartLocation(start);
          setEndLocation(end);
          setStops(selectedStops);
        }}
        initialPosition={userPosition || [28.7041, 77.1025]}
      />

      {/* BOTTOM NAV */}
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}