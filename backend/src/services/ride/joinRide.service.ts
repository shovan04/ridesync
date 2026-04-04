import RideRepo from "../../repositories/ride.repo.js";
import JoinRideDTO from "../../DTOClasses/rides/joinRide.js";

const MAX_PARTICIPANTS = 4;

export default class JoinRideService {
    public async joinRide(data: JoinRideDTO) {
        const repo = new RideRepo();

        // Find ride by code
        const ride = await repo.getRideByCode(data.rideCode);
        
        if (!ride) {
            throw new Error("Ride not found with the provided code");
        }

        // Check participant count
        const currentCount = await repo.getParticipantCount(ride.id);
        
        if (currentCount >= MAX_PARTICIPANTS) {
            throw new Error(`Ride is full. Maximum ${MAX_PARTICIPANTS} participants allowed.`);
        }

        // Add user as rider
        const participant = await repo.joinRide(ride.id, data.userId);

        if (!participant) {
            throw new Error("Failed to join ride");
        }

        return {
            rideId: ride.id,
            rideCode: ride.code,
            userId: data.userId,
            role: participant.role,
            startPoint: ride.startPoint,
            endPoint: ride.endPoint,
            currentParticipants: currentCount + 1,
            maxParticipants: MAX_PARTICIPANTS,
        };
    }
}
