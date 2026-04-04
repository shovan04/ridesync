import CreateRideDTO from "../../DTOClasses/rides/createRides.js";
import CreateRideData, { CreateRideResponse } from "../../interfaces/createRide.interface.js";
import RideRepo from "../../repositories/ride.repo.js";
import generateRideCode from "../../utilities/generateRideCode.js";

export default class RideService {
    async createRide(ride: CreateRideDTO): Promise<CreateRideResponse> {
        const repo = new RideRepo();

        let rideID: string;
        let exists = true;

        while (exists) {
            rideID = generateRideCode();

            exists = await repo.doesRideIDExist(rideID);
        }

        const rideData: CreateRideData = {
            userId: ride.userId,
            code: rideID!,
            startPoint: ride.startPoint,
            endPoint: ride.endPoint,
            distance: 0,
            duration: 0,
            overallSpeed: 0,
        };

        const rideCtData = await repo.createRide(rideData);
        return {
            rideId: rideCtData.newRide?.id,
            userId: rideCtData.rideLeader?.userId,
            code: rideCtData.newRide?.code,
            role: rideCtData.rideLeader?.role,
            startPoint: rideCtData.newRide?.startPoint,
            endPoint: rideCtData.newRide?.endPoint,
        } as CreateRideResponse;
    }
}
