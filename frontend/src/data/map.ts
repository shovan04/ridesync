import type { Rider } from "../types/rider";

export interface RideMapModalProps {
  riders: Rider[];
  isOpen: boolean;
  onClose: () => void;
  startPoint?: string; // "lat,lng"
  endPoint?: string;   // "lat,lng"
}