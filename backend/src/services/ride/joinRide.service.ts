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

        // Check if user is already a participant
        const isAlreadyParticipant = await repo.isUserParticipant(ride.id, data.userId);
        
        if (isAlreadyParticipant) {
            // User is already in the ride, get their role and return success
            const userRole = await repo.getUserRole(ride.id, data.userId);
            const currentCount = await repo.getParticipantCount(ride.id);
            
            console.log(`User ${data.userId} is already a ${userRole} in ride ${ride.code}`);
            
            return {
                rideId: ride.id,
                rideCode: ride.code,
                userId: data.userId,
                role: userRole,
                startPoint: ride.startPoint,
                endPoint: ride.endPoint,
                currentParticipants: currentCount,
                maxParticipants: MAX_PARTICIPANTS,
                alreadyJoined: true, // Flag to indicate user was already joined
            };
        }

        // Check participant count for new users
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
            alreadyJoined: false,
        };
    }
}
