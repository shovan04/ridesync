import type { Rider } from "../types/rider";

export interface RideMapModalProps {
  riders: Rider[];
  isOpen: boolean;
  onClose: () => void;
}