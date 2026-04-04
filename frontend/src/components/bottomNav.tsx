import type { JSX } from "react";
import { MapIcon, UsersIcon, ShieldCheckIcon, UserIcon } from "./MapIcon"

export type NavTab = "map" | "group" | "safety" | "profile";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; label: string; Icon: () => JSX.Element }[] = [
  { id: "map", label: "Map", Icon: MapIcon },
  { id: "group", label: "Group", Icon: UsersIcon },
  { id: "safety", label: "Safety", Icon: ShieldCheckIcon },
  { id: "profile", label: "Profile", Icon: UserIcon },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="flex items-center justify-around px-2 pb-8 pt-3 bg-[#0A0A0A] border-t border-[#141414]"
      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-1 min-w-[56px] transition-all"
          >
            <span
              className={`transition-colors ${
                isActive ? "text-[#00E5FF]" : "text-[#444]"
              }`}
            >
              <Icon />
            </span>
            <span
              className={`text-[10px] tracking-widest uppercase font-semibold transition-colors ${
                isActive ? "text-[#00E5FF]" : "text-[#444]"
              }`}
            >
              {label}
            </span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-[#00E5FF] mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
}