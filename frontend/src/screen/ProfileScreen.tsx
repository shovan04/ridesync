import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/bottomNav";
import type { NavTab } from "../components/bottomNav";
import { getActiveTab } from "../utils/getActiveTab";
import type { ProfileData } from "../types/Profile";
import { BLOOD_GROUPS, defaultProfile } from "../data/profile";


export default function ProfileScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);



  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function completion(): number {
    const checks = [
      profile.name.trim(),
      profile.age.trim(),
      profile.gender,
      profile.phone.trim(),
      profile.address.trim(),
      profile.bloodGroup,
      profile.emergencyName.trim(),
      profile.emergencyPhone.trim(),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const pct = completion();

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

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">

        {/* Page title */}
        <div className="pb-1">
          <h1
            className="text-white text-4xl leading-none mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px" }}
          >
            My Profile
          </h1>
          <p className="text-[#444] text-xs">
            Complete your profile to ride safely with your group.
          </p>
        </div>

        {/* HERO CARD */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-[72px] h-[72px] rounded-full border-2 border-[#00E5FF] bg-[#0d2a2e] flex items-center justify-center text-[#00E5FF] text-3xl"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {profile.name.slice(0, 2).toUpperCase() || "YS"}
            </div>
            <button className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-[#00E5FF] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5l2 2L3 11H1v-2L8.5 1.5z" stroke="#000" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-xl leading-none mb-1"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {profile.name || "Your Name"}
            </p>
            <p className="text-[#444] text-xs">Rider · Joined 2025</p>
          </div>

          {/* Completion bar */}
          <div className="w-full">
            <div className="flex justify-between mb-1.5">
              <span className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Profile Completion
              </span>
              <span className="text-[10px] font-bold text-[#00E5FF]"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00E5FF] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* PERSONAL INFO CARD */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-4">
          <CardHeader icon={<PersonIcon />} label="Personal Info" />

          <Field label="Full Name">
            <Input
              placeholder="Your full name"
              value={profile.name}
              onChange={(v) => update("name", v)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Age">
              <Input
                type="number"
                placeholder="24"
                value={profile.age}
                onChange={(v) => update("age", v)}
              />
            </Field>
            <Field label="Gender">
              <div className="relative">
                <select
                  value={profile.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3.5 py-3 text-white text-sm outline-none focus:border-[#00E5FF] transition-colors appearance-none"
                  style={{ fontFamily: "'Barlow', sans-serif" }}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5l3 3 3-3" stroke="#555" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Field>
          </div>

          <Field label="Phone Number">
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={profile.phone}
              onChange={(v) => update("phone", v)}
            />
          </Field>

          <Field label="Address">
            <Input
              placeholder="City, State"
              value={profile.address}
              onChange={(v) => update("address", v)}
            />
          </Field>
        </div>

        {/* SAFETY INFO CARD */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col gap-4">
          <CardHeader icon={<SafetyIcon />} label="Safety Info" accent />

          {/* Blood group */}
          <Field label="Blood Group">
            <div className="grid grid-cols-4 gap-1.5">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => update("bloodGroup", bg)}
                  className={`rounded-[10px] py-2.5 text-sm font-bold transition-all
                    ${profile.bloodGroup === bg
                      ? "bg-[#1a0000] border border-[#ff4444] text-[#ff6666]"
                      : "bg-[#0A0A0A] border border-[#222] text-[#555] active:scale-95"
                    }`}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {bg}
                </button>
              ))}
            </div>
          </Field>

          {/* Emergency contact */}
          <div className="bg-[#0A0A0A] border border-[#ff4444]/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z"
                  stroke="#ff4444" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              <span className="text-[9px] tracking-[1.5px] font-bold text-[#ff4444] uppercase"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Emergency Contact
              </span>
            </div>
            <Field label="Contact Name">
              <Input
                placeholder="Parent / Partner / Friend"
                value={profile.emergencyName}
                onChange={(v) => update("emergencyName", v)}
                dark
              />
            </Field>
            <Field label="Contact Phone">
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={profile.emergencyPhone}
                onChange={(v) => update("emergencyPhone", v)}
                dark
              />
            </Field>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 rounded-[14px] py-4 font-bold text-base tracking-wider uppercase transition-all active:scale-95
            ${saved
              ? "bg-[#0d2a2e] border border-[#00E5FF] text-[#00E5FF]"
              : "bg-[#00E5FF] text-black"
            }`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
        >
          {saved ? (
            "Saved!"
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Save Profile
            </>
          )}
        </button>

      </div>

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}

/* ── Sub-components ── */

function CardHeader({ icon, label, accent = false }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span
        className={`text-sm font-bold tracking-widest uppercase ${accent ? "text-[#ff4444]" : "text-[#555]"}`}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] tracking-[1.5px] text-[#555] uppercase font-semibold"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  placeholder, value, onChange, type = "text", dark = false,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dark?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-xl px-3.5 py-3 text-white text-sm outline-none focus:border-[#00E5FF] transition-colors placeholder:text-[#333]
        ${dark ? "bg-[#111] border-[#2a1a1a]" : "bg-[#0A0A0A] border-[#222]"}`}
      style={{ fontFamily: "'Barlow', sans-serif", caretColor: "#00E5FF" }}
    />
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="#555" strokeWidth="1.3"/>
      <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#555" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function SafetyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L5 4H2v3l-1 1 1 1v3h3l3 3 3-3h3V9l1-1-1-1V4h-3L8 1z"
        stroke="#ff4444" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}