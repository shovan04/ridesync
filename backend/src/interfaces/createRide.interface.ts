export default interface CreateRideData {
    userId: string;
    code: string;
    startPoint: string;
    endPoint: string;
    distance?: number;
    duration?: number;
    overallSpeed?: number;
}

export interface CreateRideResponse {
    rideId: string;
    userId: string;
    code: string;
    startPoint: string;
    endPoint: string;
}
