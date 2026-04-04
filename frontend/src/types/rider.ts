export type RiderStatus = "on-route" | "off-route";

export interface Rider {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: RiderStatus;
  distanceBehind?: string;
}