import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../components/bottomNav";
import type { NavTab } from "../components/bottomNav";
import { getActiveTab } from "../utils/getActiveTab";
import RideMapModal from "./RideMapModel";
import type { Rider } from "../types/rider";
import { mockRiders } from "../data/rider";
import { getRideByCode, startRide } from "../services/api";

export default function ActiveRideScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [liveDot, setLiveDot] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const activeTab = getActiveTab(location.pathname);
  
  // Ride details state
  const [rideCode, setRideCode] = useState("");
  const [rideDetails, setRideDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startingRide, setStartingRide] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setLiveDot((v) => !v), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Load ride code from localStorage on mount
  useEffect(() => {
    const savedRideCode = localStorage.getItem('currentRideCode');
    if (savedRideCode) {
      setRideCode(savedRideCode);
      fetchRideDetails(savedRideCode);
    }
  }, []);
  
  async function fetchRideDetails(code: string) {
    if (!code.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const data = await getRideByCode(code);
      setRideDetails(data);
      localStorage.setItem('currentRideCode', code);
    } catch (err: any) {
      console.error('Error fetching ride:', err);
      setError(err.message || 'Ride not found');
      setRideDetails(null);
    } finally {
      setLoading(false);
    }
  }
  
  function handleSearchRide() {
    fetchRideDetails(rideCode);
  }
  
  async function handleStartRide() {
    const userId = localStorage.getItem('userId');
    if (!userId || !rideDetails) {
      setError('User ID or ride details not found');
      return;
    }
    
    setStartingRide(true);
    setError("");
    
    try {
      await startRide(rideDetails.rideId, userId);
      // Refresh ride details to get updated status
      await fetchRideDetails(rideDetails.code);
    } catch (err: any) {
      console.error('Error starting ride:', err);
      setError(err.message || 'Failed to start ride');
    } finally {
      setStartingRide(false);
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
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
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

      {/* STATUS BAR */}
      <div className="flex items-center px-5 pb-3 gap-0">
        <StatusItem label="Connection">
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] inline-block"
              style={{ opacity: liveDot ? 1 : 0.3, transition: "opacity 0.3s" }}
            />
            <span>{rideDetails ? `Live · ${rideDetails.participantCount || 0} riders` : 'No active ride'}</span>
          </span>
        </StatusItem>
        <StatusItem label="Battery">88%</StatusItem>
        <StatusItem label="Weather" last>24°C</StatusItem>
      </div>

      {/* RIDE DETAILS OR INPUT */}
      {rideDetails ? (
        // Show ride details
        <div className="mx-4 mb-4 bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 flex flex-col gap-3">
          {/* Ride Code Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1e1e1e]">
            <div>
              <p className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Room Code
              </p>
              <p className="text-[#00E5FF] text-2xl font-bold font-mono tracking-widest">{rideDetails.code}</p>
            </div>
            <button
              onClick={() => {
                setRideDetails(null);
                setRideCode("");
                localStorage.removeItem('currentRideCode');
              }}
              className="text-[#888] hover:text-white transition-colors text-xs px-3 py-1.5 rounded-lg border border-[#222] hover:border-[#333]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Change
            </button>
          </div>

          {/* Route Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Start Point
              </span>
              <span className="text-white text-sm font-medium truncate" title={rideDetails.startPoint}>
                {rideDetails.startPoint}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                End Point
              </span>
              <span className="text-white text-sm font-medium truncate" title={rideDetails.endPoint}>
                {rideDetails.endPoint}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-t border-[#1e1e1e] pt-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Distance
              </span>
              <span className="text-[#00E5FF] text-xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.distance || 0} <span className="text-xs text-[#444]">km</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 pl-3 border-l border-[#1e1e1e]">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Duration
              </span>
              <span className="text-[#00E5FF] text-xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.duration || 0} <span className="text-xs text-[#444]">min</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 pl-3 border-l border-[#1e1e1e]">
              <span className="text-[9px] tracking-[1.5px] text-[#444] uppercase font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Riders
              </span>
              <span className="text-[#00E5FF] text-xl font-bold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.participantCount || 0}
              </span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="pt-2 border-t border-[#1e1e1e]">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              rideDetails.status === 'active' 
                ? 'bg-green-900/20 border border-green-500' 
                : 'bg-yellow-900/20 border border-yellow-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                rideDetails.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                rideDetails.status === 'active' ? 'text-green-400' : 'text-yellow-400'
              }`} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rideDetails.status === 'active' ? 'Ride Active - Broadcasting' : 'Waiting to Start'}
              </span>
            </div>
          </div>
          
          {/* Start Ride Button (only for marshal when ride not started) */}
          {rideDetails.status !== 'active' && (
            <button
              onClick={handleStartRide}
              disabled={startingRide}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold text-base transition-all active:scale-95
                ${startingRide
                  ? "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
                  : "bg-[#00E5FF] text-black hover:bg-[#00E5FF]/90"
                }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px", fontSize: "16px" }}
            >
              {startingRide ? "Starting..." : "🚀 Start Ride & Broadcast Location"}
            </button>
          )}
        </div>
      ) : (
        // No ride loaded - show waiting message
        <div className="mx-4 mb-4 bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
          <div className="text-[#444] text-6xl">📍</div>
          <div className="text-center">
            <p className="text-white text-lg font-semibold mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              No Active Ride
            </p>
            <p className="text-[#666] text-sm">
              Create a ride from the Group tab to get started
            </p>
          </div>
        </div>
      )}

      {/* MAP AREA */}
      <div className="flex-1 relative overflow-hidden">
        {/* Map background */}
        <div className="absolute inset-0 bg-[#0d0d0d]">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 390 260"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Topo contour lines */}
            {[
              "M-20,240 Q60,180 140,200 Q220,220 300,160 Q360,120 420,140",
              "M-20,210 Q80,155 160,175 Q240,195 310,135 Q370,100 430,120",
              "M-20,180 Q90,130 170,148 Q250,168 330,110 Q385,78 440,98",
              "M-20,150 Q100,108 180,122 Q260,140 340,85 Q395,55 445,75",
              "M-20,270 Q50,215 130,228 Q210,245 285,185 Q350,145 415,162",
              "M30,290 Q90,240 160,258 Q230,278 300,210 Q360,168 420,188",
            ].map((d, i) => (
              <path key={i} d={d} stroke="#161616" strokeWidth="1.5" fill="none" />
            ))}
            {/* Road base */}
            <path
              d="M195,260 Q195,200 200,170 Q208,140 220,110 Q235,80 260,55"
              stroke="#222"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dashed route */}
            <path
              d="M195,260 Q195,200 200,170 Q208,140 220,110 Q235,80 260,55"
              stroke="#00E5FF"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="8 10"
            />
            {/* Rider position */}
            <circle cx="200" cy="175" r="8" fill="#00E5FF" opacity="0.2" />
            <circle cx="200" cy="175" r="5" fill="#00E5FF" />
            <circle cx="200" cy="175" r="2.5" fill="#fff" />
          </svg>
        </div>

        {/* Speed overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] text-center z-10"
         onClick={() => setMapOpen(true)}>
          <div
            className="text-white leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "96px", letterSpacing: "-2px" }}
          >
            82
          </div>
          <div
            className="text-[#00E5FF] text-base font-semibold tracking-[3px] -mt-2"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            KM/H
          </div>
        </div>
        <RideMapModal 
          riders={mockRiders}
          isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
/>

        {/* Rider chips */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3 pt-12 flex gap-2 items-end"
          style={{ background: "linear-gradient(to top, #0A0A0A 70%, transparent)" }}>
          {mockRiders.map((rider) => (
            <RiderChip key={rider.id} rider={rider} />
          ))}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex items-center justify-between px-4 py-3 pb-8 bg-[#0A0A0A] border-t border-[#141414]">
        <button className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center text-[#888] text-xl font-light">
          +
        </button>

        <button className="flex items-center gap-2.5 bg-[#cc0000] rounded-full px-6 py-3 active:scale-95 transition-transform">
          <div>
            <div
              className="text-white text-xl tracking-[3px]"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              SOS
            </div>
            <div className="text-[9px] tracking-[1px] text-white/50 uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Hold to alert group
            </div>
          </div>
        </button>

        <button className="w-10 h-10 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center relative">
          <GroupIcon />
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#00E5FF] text-black text-[9px] font-bold flex items-center justify-center"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            5
          </span>
        </button>
        
      </div>
          <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}

/* ── Sub-components ── */

function StatusItem({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 pr-5 mr-5 ${!last ? "border-r border-[#222]" : ""}`}
    >
      <span
        className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold text-[#ccc]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {children}
      </span>
    </div>
  );
}

function RiderChip({ rider }: { rider: Rider }) {
  const isAlert = rider.status === "off-route";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 flex-1 border ${
        isAlert
          ? "bg-[#1a0a0a] border-[#ff4444]"
          : "bg-[#111] border-[#222]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isAlert ? "bg-[#ff4444]" : "bg-[#00E5FF]"
        }`}
        style={isAlert ? { animation: "pulse 0.8s infinite" } : undefined}
      />
      <div>
        <div
          className={`text-xs font-semibold whitespace-nowrap ${
            isAlert ? "text-[#ff6666]" : "text-[#ccc]"
          }`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {rider.name}
        </div>
        <div
          className={`text-[9px] whitespace-nowrap ${
            isAlert ? "text-[#993333]" : "text-[#444]"
          }`}
        >
          {isAlert ? `Off route · ${rider.distanceBehind}` : "On route"}
        </div>
      </div>
    </div>
  );
}

function TurnLeftIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 20 L8 10 L18 10" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 6 L18 10 L14 14" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6" cy="6" r="2.5" stroke="#888" strokeWidth="1.5" />
      <circle cx="12" cy="6" r="2.5" stroke="#888" strokeWidth="1.5" />
      <path d="M1 15c0-2.8 2.2-5 5-5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 15c0-2.8-2.2-5-5-5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}