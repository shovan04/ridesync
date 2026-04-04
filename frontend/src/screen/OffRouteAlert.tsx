import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OffRouteAlertProps } from "../types/offRoute";

export default function OffRouteAlert({
  name = "Ahmed",
  lastSeen = "Rohtang Pass",
  minsAgo = 4,
  lastSpeed = 12,
  elevation = 3978,
  emergencyContacts = ["Alex Rivers", "2 others"],
  onShare,
  onCall,
}: OffRouteAlertProps) {
  const [shared, setShared] = useState(false);
  const navigate = useNavigate();

  const handleShare = () => {
    setShared(true);
    onShare?.();
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-start px-6 pt-16 pb-10"
      style={{
        background:
          "radial-gradient(ellipse at top, #7a1010 0%, #3d0707 40%, #1a0303 100%)",
      }}
    >
      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "150px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Back button */}
        <div className="w-full flex justify-end">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
            aria-label="Go back"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Warning icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #f97316, #ea580c)",
            boxShadow:
              "0 0 30px rgba(249,115,22,0.5), 0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path
              d="M18 6L32 30H4L18 6Z"
              fill="black"
              fillOpacity="0.85"
              stroke="black"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <rect x="16.5" y="15" width="3" height="8" rx="1.5" fill="#f97316" />
            <circle cx="18" cy="26.5" r="1.75" fill="#f97316" />
          </svg>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-white font-black text-4xl leading-tight tracking-tight">
            {name} is off route
          </h1>
          <p className="mt-3 text-white/60 text-sm leading-relaxed">
            Last seen near {lastSeen} — {minsAgo} mins ago
          </p>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div
            className="rounded-xl px-4 py-4 flex flex-col gap-1"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-white/40 text-xs tracking-widest uppercase font-semibold">
              Last Speed
            </span>
            <span className="text-white text-2xl font-bold">{lastSpeed} km/h</span>
          </div>
          <div
            className="rounded-xl px-4 py-4 flex flex-col gap-1"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-white/40 text-xs tracking-widest uppercase font-semibold">
              Elevation
            </span>
            <span className="text-white text-2xl font-bold">
              {elevation.toLocaleString()}m
            </span>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{
            background: shared
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #22e5e5, #06b6d4)",
            color: "#000",
            boxShadow: shared
              ? "0 4px 20px rgba(34,197,94,0.4)"
              : "0 4px 20px rgba(6,182,212,0.4)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="black" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="3" stroke="black" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="1" fill="black" />
          </svg>
          {shared ? "Location Shared ✓" : "Share My Location"}
        </button>

        {/* Call button */}
        <button
          onClick={onCall}
          className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 text-white transition-all active:scale-95 hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 2h3.5l1.5 4-2 1.5c.9 2 2.5 3.6 4.5 4.5L12 10l4 1.5V15c0 .6-.4 1-1 1C6.2 16 2 11.8 2 3c0-.6.4-1 1-1Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Call {name}
        </button>

        {/* Emergency notice */}
        <div
          className="w-full rounded-xl px-4 py-3 flex items-start gap-3"
          style={{
            background: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.25)",
          }}
        >
          <div className="mt-0.5 shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <ellipse cx="9" cy="9" rx="6" ry="6" stroke="#f97316" strokeWidth="1.5" />
              <path d="M4 6 Q9 2 14 6" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <path d="M4 12 Q9 16 14 12" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <line x1="3" y1="9" x2="15" y2="9" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="9" cy="9" r="1.2" fill="#f97316" />
            </svg>
          </div>
          <div>
            <p className="text-orange-400 font-semibold text-sm">
              Emergency Contacts Notified
            </p>
            <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
              A distress signal was automatically sent to{" "}
              <span className="text-white/70">{emergencyContacts[0]}</span> and{" "}
              {emergencyContacts[1]}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}