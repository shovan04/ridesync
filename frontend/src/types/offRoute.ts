export interface OffRouteAlertProps {
  name?: string;
  lastSeen?: string;
  minsAgo?: number;
  lastSpeed?: number;
  elevation?: number;
  emergencyContacts?: string[];
  onShare?: () => void;
  onCall?: () => void;
}