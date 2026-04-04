export type RiderStatus = "on-route" | "off-route";

export interface Rider {
  id: string;
  name: string;
  status: RiderStatus;
  distanceBehind?: string;
  lat: number;
  lng: number;
}