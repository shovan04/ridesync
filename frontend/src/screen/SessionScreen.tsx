import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/bottomNav";
import type { NavTab } from "../components/bottomNav";
import { getActiveTab } from "../utils/getActiveTab";
import { createRide } from "../services/api";
import { geocodeLocation } from "../utils/geocoding";

export default function SessionScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleCodeInput(index: number, value: string) {
    const char = value.slice(-1).toUpperCase();
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

  async function handleCreateRide() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Create profile first');
      return;
    }

    if (!startLocation.trim() || !endLocation.trim()) {
      setError('Please enter both start and end locations');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const startPoint = await geocodeLocation(startLocation);
      const endPoint = await geocodeLocation(endLocation);

      const response = await createRide({
        userId,
        startPoint,
        endPoint
      });

      console.log('Ride created:', response);
      setStartLocation('');
      setEndLocation('');
    } catch (err) {
      console.error('Error creating ride:', err);
      setError('Failed to create ride. Please check locations and try again.');
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

  const codeComplete = code.every((c) => c !== "");

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
            <div className="flex gap-2">
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className={`flex-1 h-14 rounded-xl text-center text-xl font-bold uppercase bg-[#0A0A0A] border outline-none transition-all
                    ${char
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
            disabled={!codeComplete}
            className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold text-base transition-all
              ${codeComplete
                ? "bg-[#00E5FF] text-black active:scale-95"
                : "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
              }`}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px", fontSize: "16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2l2 5h5l-4 3 1.5 5L9 12l-4.5 3L6 10 2 7h5z" fill="currentColor"/>
            </svg>
            Connect to Session
          </button>
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

            {/* Start Location */}
            <div>
              <p
                className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                Start Location
              </p>
              <input
                type="text"
                placeholder="Enter start location"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors placeholder:text-[#333]"
                style={{ fontFamily: "'Barlow', sans-serif", caretColor: "#00E5FF" }}
              />
            </div>

            {/* End Location */}
            <div>
              <p
                className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold mb-2"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                End Location
              </p>
              <input
                type="text"
                placeholder="Enter end location"
                value={endLocation}
                onChange={(e) => setEndLocation(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors placeholder:text-[#333]"
                style={{ fontFamily: "'Barlow', sans-serif", caretColor: "#00E5FF" }}
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Create Ride button */}
            <button
              onClick={handleCreateRide}
              disabled={isCreating || !startLocation.trim() || !endLocation.trim()}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold text-base transition-all active:scale-95
                ${isCreating || !startLocation.trim() || !endLocation.trim()
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

      {/* BOTTOM NAV */}
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}