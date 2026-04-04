export interface Ride {
  rideId: string;
  userId: string;
  code: string;
  role: string;
  startPoint: string;
  endPoint: string;
}

export interface CreateRidePayload {
  userId: string;
  startPoint: string;
  endPoint: string;
}