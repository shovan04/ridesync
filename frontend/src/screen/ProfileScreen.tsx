import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createUser, getUser, createRide, joinRide } from "../services/api";
import { mapProfileToUser, mapUserToProfile } from "../mappers/userMapper";
import BottomNav from "../components/bottomNav";
import type { NavTab } from "../components/bottomNav";
import { getActiveTab } from "../utils/getActiveTab";
import type { ProfileData } from "../types/Profile";
import { BLOOD_GROUPS, defaultProfile } from "../data/profile";

export default function ProfileScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [rideCode, setRideCode] = useState("");
  const [rideLoading, setRideLoading] = useState(false);
  const [rideMessage, setRideMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const userData = await getUser(userId);
          setUser(userData);
          setProfile(mapUserToProfile(userData));
          setIsEditing(false);
        } catch (error) {
          console.error('Error loading user:', error);
          localStorage.removeItem('userId');
          setIsEditing(true);
        }
      } else {
        setIsEditing(true);
      }
    };
    loadUser();
  }, []);



  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const payload = mapProfileToUser(profile);
      const userData = await createUser(payload);

      if (userData && userData.id) {
        localStorage.setItem('userId', userData.id);
        const fullUserData = await getUser(userData.id);
        setUser(fullUserData);
        setProfile(mapUserToProfile(fullUserData));
        setIsEditing(false);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error("Error creating user:", err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setIsEditing(true);
  }

async function handleCreateRide() {
  if (!user) return

  setRideLoading(true)
  setRideMessage(null)

  try {
    const rideData = await createRide({
      userId: user.id,
      startPoint: 'Delhi',
      endPoint: 'Manali'
    })
    console.log('Ride created:', rideData)
    setRideMessage({ type: 'success', text: 'Ride created successfully!' })
  } catch (err) {
    console.error("Error creating ride:", err)
    setRideMessage({ type: 'error', text: 'Failed to create ride. Please try again.' })
  } finally {
    setRideLoading(false)
  }
}

async function handleJoinRide() {
  if (!user || !rideCode.trim()) return

  setRideLoading(true)
  setRideMessage(null)

  try {
    const joinData = await joinRide({
      userId: user.id,
      rideCode: rideCode.trim()
    })
    console.log('Ride joined:', joinData)
    setRideMessage({ type: 'success', text: 'Successfully joined the ride!' })
    setRideCode("")
  } catch (err) {
    console.error("Error joining ride:", err)
    setRideMessage({ type: 'error', text: 'Failed to join ride. Please check the code and try again.' })
  } finally {
    setRideLoading(false)
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

        {isEditing ? (
          /* EDITING MODE - FORM */
          <>
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
                    <path d="M8.5 1.5l2 L3 11H1v-2L8.5 1.5z" stroke="#000" strokeWidth="1.2" strokeLinejoin="round"/>
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

              <Field label="Email Address">
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={profile.email}
                  onChange={(v) => update("email", v)}
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
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 rounded-[14px] py-4 font-bold text-base tracking-wider uppercase transition-all active:scale-95
                ${loading
                  ? "bg-[#0d2a2e] text-[#1a5a63] cursor-not-allowed"
                  : "bg-[#00E5FF] text-black"
                }`}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </>
        ) : (
          /* VIEW MODE - PROFILE DISPLAY */
          <div className="max-w-md mx-auto mt-10">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 shadow-lg flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Profile Details
                </h2>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-[#00E5FF] text-black rounded-lg font-semibold hover:bg-[#00E5FF]/90 transition-colors"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  Edit Profile
                </button>
              </div>

              {/* Profile Info */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Name:</span>
                  <span className="text-white font-medium">{user?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Age:</span>
                  <span className="text-white font-medium">{user?.age || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Email:</span>
                  <span className="text-white font-medium">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Phone:</span>
                  <span className="text-white font-medium">{user?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Emergency Contact:</span>
                  <span className="text-white font-medium">{user?.emergencyContact || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Address:</span>
                  <span className="text-white font-medium">{user?.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Blood Group:</span>
                  <span className="text-white font-medium">{user?.bloodGroup || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#888] text-sm">Gender:</span>
                  <span className="text-white font-medium">{user?.gender || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIDE ACTIONS - Only show when user exists */}
        {user && (
          <div className="mt-8 space-y-4">
            <h3 className="text-[#00E5FF] font-bold text-lg uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Ride Actions
            </h3>

            {/* Create Ride Button */}
            <button
              onClick={handleCreateRide}
              disabled={rideLoading}
              className="w-full flex items-center justify-center gap-2 rounded-[14px] py-4 font-bold text-base tracking-wider uppercase transition-all active:scale-95 bg-[#00E5FF] text-black disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
            >
              {rideLoading ? "Creating..." : "Create New Ride"}
            </button>

            {/* Join Ride Section */}
            <div className="space-y-3">
              <Field label="Ride Code">
                <Input
                  type="text"
                  placeholder="Enter ride code"
                  value={rideCode}
                  onChange={setRideCode}
                  dark
                />
              </Field>
              <button
                onClick={handleJoinRide}
                disabled={rideLoading || !rideCode.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-[14px] py-4 font-bold text-base tracking-wider uppercase transition-all active:scale-95 bg-[#0d2a2e] border border-[#00E5FF] text-[#00E5FF] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "1px" }}
              >
                {rideLoading ? "Joining..." : "Join Ride"}
              </button>
            </div>

            {/* Ride Action Messages */}
            {rideMessage && (
              <div className={`p-3 rounded-[8px] text-center font-medium ${
                rideMessage.type === 'success'
                  ? 'bg-green-900/20 border border-green-500 text-green-400'
                  : 'bg-red-900/20 border border-red-500 text-red-400'
              }`}>
                {rideMessage.text}
              </div>
            )}
          </div>
        )}

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