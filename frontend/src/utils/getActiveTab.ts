import type { NavTab } from "../components/bottomNav";

export function getActiveTab(pathname: string): NavTab {
  if (pathname === "/") return "map";
  if (pathname === "/session") return "group";
  if (pathname === "/alert/off-route") return "safety";
  if (pathname === "/profile") return "profile";
  return "map";
}
