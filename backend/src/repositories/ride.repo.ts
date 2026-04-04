import db from "../db/index.js";
import { rideParticipants, rides, roleEnum } from "../db/schema.js";
import CreateRideData from "../interfaces/createRide.interface.js";

export default class RideRepo {

    async doesRideIDExist(rideID: string) {
        const ride = await db.query.rides.findFirst({
            where: (t, { eq }) => eq(t.code, rideID),
        });

        return !!ride;
    }

    async createRide(ride: CreateRideData) {
        const [newRide] = await db.insert(rides).values(ride).returning();
        const [rideLeader] = await db.insert(rideParticipants).values({
            rideId: newRide!.id,
            userId: ride.userId,
            role: "marshal"
        }).returning();

        return { newRide, rideLeader };
    }

    async getRideByCode(rideCode: string) {
        return await db.query.rides.findFirst({
            where: (t, { eq }) => eq(t.code, rideCode),
        });
    }

    async getParticipantCount(rideId: string): Promise<number> {
        const result = await db.query.rideParticipants.findMany({
            where: (t, { eq }) => eq(t.rideId, rideId),
        });
        return result.length;
    }

    async joinRide(rideId: string, userId: string) {
        const [participant] = await db.insert(rideParticipants).values({
            rideId,
            userId,
            role: "rider"
        }).returning();
        return participant;
    }
 
    async addRideLeader(){}
}
